import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { AlarmListener } from './platformAccessory';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

interface AlarmListenerParams{
  deviceId: string;
  reading: boolean;
}



/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class AlarmDetectHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  private activeAccessories: AlarmListener[] =[];

  //SPECIFIC TO ALARMDETECT PLUGIN CONFIGS
  private app;




  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.app = express();
    this.app.use(bodyParser.json());

    this.app.put('/reading/add/:deviceid/:reading', (req: Request, res: Response) => {
      const { deviceid, reading } = req.params;

      // Validate that reading is a number
      const readingNumber = parseFloat(reading);
      if (isNaN(readingNumber)) {
        return res.status(400).send({ error: 'Reading must be a valid number' });
      }


      if(this.activeAccessories[deviceid] === undefined){
        this.addDevice({deviceId: deviceid, reading:true});
      }
      this.activeAccessories[deviceid].updateReading(true);



      res.status(200).send({ message: 'Reading updated successfully', reading:reading, deviceid:deviceid });
    });

    const port = 8080;

    this.app.listen(port, () => {
      this.log.info(`Server is running on http://localhost:${port}`);
    });

    // Homebridge 1.8.0 introduced a `log.success` method that can be used to log success messages
    // For users that are on a version prior to 1.8.0, we need a 'polyfill' for this method
    if (!log.success) {
      log.success = log.info;
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      const uuid = this.api.hap.uuid.generate('help');

      const accessory = new this.api.platformAccessory('name', uuid);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.discoverDevices();
    });


  }

  /*
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
  }


  addDevice(device: AlarmListenerParams) {

    const uuid = this.api.hap.uuid.generate(device.deviceId);

    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

    if (existingAccessory) {
      // the accessory already exists
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

      this.activeAccessories[device.deviceId] = new AlarmListener(this, existingAccessory);

    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info('Adding new accessory:', device.deviceId);

      // create a new accessory
      const accessory = new this.api.platformAccessory(device.deviceId, uuid);

      accessory.context.device = device;

      this.activeAccessories[device.deviceId] = new AlarmListener(this, accessory);

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

  }
}
