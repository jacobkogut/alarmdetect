import { Service, PlatformAccessory } from 'homebridge';

import { AlarmDetectHomebridgePlatform } from './platform';



/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class AlarmListener {
  private service: Service;
  private lastDetectedDate?: Date;

  constructor(
    private readonly platform: AlarmDetectHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.service = this.accessory.getService(this.platform.Service.OccupancySensor) ||
      this.accessory.addService(this.platform.Service.OccupancySensor);

    setInterval(()=>{

      if(this.lastDetectedDate !== undefined && this.isOccupancyDetectedInLast5Mins()){
        this.service.setCharacteristic(this.platform.Characteristic.OccupancyDetected, false);
      }
    }, 60000);

    this.service.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
      .onGet(this.handleOccupancyDetectedGet.bind(this));



    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Default-Manufacturer')
      .setCharacteristic(this.platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceId);

  }

  isOccupancyDetectedInLast5Mins(){
    if(this.lastDetectedDate === undefined){
      return false;
    }


    const currTime = new Date();
    return currTime.getTime() - this.lastDetectedDate.getTime() > 300000;
  }

  handleOccupancyDetectedGet() {
    this.platform.log.info('Triggered GET OccupancyDetected');

    // set this to a valid value for OccupancyDetected
    return this.isOccupancyDetectedInLast5Mins();
  }

  updateReading(reading: boolean){
    if(reading){
      this.lastDetectedDate = new Date();
    }
    this.service.setCharacteristic(this.platform.Characteristic.OccupancyDetected, reading);
  }
}
