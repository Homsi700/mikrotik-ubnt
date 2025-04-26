const RosApi = require('routeros-client');
const snmp = require('snmp-node');
const { Client } = require('ssh2');
const axios = require('axios');

class DeviceService {
  async connectToDevice(device) {
    try {
      switch (device.type) {
        case 'mikrotik':
          const connection = new RosApi({
            host: device.ipAddress,
            user: device.username,
            password: device.password,
            port: device.port
          });

          await connection.connect();
          return connection;

        case 'ubnt':
          return this.connectToUBNT(device);

        case 'mimosa':
          return this.connectToMimosa(device);

        default:
          throw new Error(`Device type ${device.type} not supported`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to device: ${error.message}`);
    }
  }

  async connectToUBNT(device) {
    const conn = new Client();
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve)
          .on('error', reject)
          .connect({
            host: device.ipAddress,
            port: device.port || 22,
            username: device.username,
            password: device.password
          });
    });
    return conn;
  }

  async connectToMimosa(device) {
    await axios.get(`http://${device.ipAddress}/status`, {
      auth: {
        username: device.username,
        password: device.password
      }
    });
    return { ipAddress: device.ipAddress, auth: { username: device.username, password: device.password } };
  }

  async getDeviceInfo(connection, deviceType) {
    try {
      if (deviceType === 'mikrotik') {
        const identity = await connection.write('/system/identity/print');
        const resources = await connection.write('/system/resource/print');
        return {
          identity: identity[0]?.name || 'Unknown',
          model: resources[0]?.board-name || 'Unknown',
          version: resources[0]?.version || 'Unknown',
          cpu: resources[0]?.['cpu-load'] || 0,
          uptime: resources[0]?.uptime || 'Unknown',
          memory: {
            total: resources[0]?.['total-memory'] || 0,
            free: resources[0]?.['free-memory'] || 0
          }
        };
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to get device info: ${error.message}`);
    }
  }

  async getDeviceStatistics(connection, deviceType) {
    try {
      switch (deviceType) {
        case 'mikrotik':
          return await this.getMikrotikStats(connection);
        case 'ubnt':
          return await this.getUBNTStats(connection);
        case 'mimosa':
          return await this.getMimosaStats(connection);
        default:
          throw new Error(`Device type ${deviceType} not supported`);
      }
    } catch (error) {
      throw new Error(`Failed to get device statistics: ${error.message}`);
    }
  }

  async getMikrotikStats(connection) {
    try {
      const interfaces = await connection.write('/interface/print');
      const interfaceStats = await connection.write('/interface/monitor-traffic', [
        '=interface=' + interfaces[0].name,
        '=once'
      ]);

      const wirelessStats = await connection.write('/interface/wireless/registration-table/print');

      const activeLeases = await connection.write('/ip/dhcp-server/lease/print', [
        '=.proplist=status',
        '?status=bound'
      ]);
      const allLeases = await connection.write('/ip/dhcp-server/lease/print', [
        '=.proplist=status'
      ]);

      const signalData = await connection.write('/interface/wireless/monitor', [
        '=numbers=' + interfaces.find(i => i.type === 'wlan')?.name,
        '=once'
      ]);

      const txRate = interfaceStats[0]['tx-bits-per-second'] / 1000000;
      const rxRate = interfaceStats[0]['rx-bits-per-second'] / 1000000;

      return {
        transmit: {
          bytesPerSecond: parseInt(interfaceStats[0]['tx-bits-per-second'] / 8),
          packetsPerSecond: parseInt(interfaceStats[0]['tx-packets-per-second']),
          rate: parseFloat(txRate.toFixed(2)),
          totalBytes: parseInt(interfaceStats[0]['tx-byte'])
        },
        receive: {
          bytesPerSecond: parseInt(interfaceStats[0]['rx-bits-per-second'] / 8),
          packetsPerSecond: parseInt(interfaceStats[0]['rx-packets-per-second']),
          rate: parseFloat(rxRate.toFixed(2)),
          totalBytes: parseInt(interfaceStats[0]['rx-byte'])
        },
        wireless: {
          signalStrength: signalData?.[0]?.['signal-strength'] || 'N/A',
          ccq: signalData?.[0]?.['ccq'] || 'N/A',
          txRate: signalData?.[0]?.['tx-rate'] || 'N/A',
          rxRate: signalData?.[0]?.['rx-rate'] || 'N/A',
          connectedClients: wirelessStats.length
        },
        users: {
          active: activeLeases.length,
          inactive: allLeases.length - activeLeases.length,
          total: allLeases.length
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get Mikrotik stats: ${error.message}`);
    }
  }

  async getUBNTStats(connection) {
    return new Promise((resolve, reject) => {
      connection.exec('mca-status', (err, stream) => {
        if (err) reject(err);
        let data = '';
        stream.on('data', chunk => data += chunk);
        stream.on('end', () => {
          try {
            const stats = this.parseUBNTOutput(data);
            resolve({
              wireless: {
                signalStrength: stats.signal || 'N/A',
                noiseFloor: stats.noise || 'N/A',
                txRate: stats.txRate || 'N/A',
                rxRate: stats.rxRate || 'N/A',
                quality: stats.quality || 'N/A',
                ccq: stats.ccq || 'N/A',
                distance: stats.distance || 'N/A',
                frequency: stats.frequency || 'N/A',
                chainRssi: stats.chainRssi || [],
                connectedClients: stats.clients || 0
              },
              transmit: {
                rate: stats.txRate || 0,
                bytesPerSecond: stats.txBytes || 0,
                packetsPerSecond: stats.txPackets || 0
              },
              receive: {
                rate: stats.rxRate || 0,
                bytesPerSecond: stats.rxBytes || 0,
                packetsPerSecond: stats.rxPackets || 0
              },
              lastUpdated: new Date()
            });
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }

  async getMimosaStats(connection) {
    try {
      const response = await axios.get(`http://${connection.ipAddress}/status`, {
        auth: connection.auth
      });

      const data = response.data;
      return {
        wireless: {
          signalStrength: data.radio?.rxPower || 'N/A',
          noiseFloor: data.radio?.noiseFloor || 'N/A',
          txPower: data.radio?.txPower || 'N/A',
          frequency: data.radio?.frequency || 'N/A',
          bandwidth: data.radio?.bandwidth || 'N/A',
          modulation: data.radio?.modulation || 'N/A',
          connectedClients: data.clients?.length || 0,
          chainRssi: data.radio?.chains?.map(chain => chain.rssi) || []
        },
        transmit: {
          rate: data.statistics?.tx?.rate || 0,
          bytesPerSecond: data.statistics?.tx?.bytes || 0,
          packetsPerSecond: data.statistics?.tx?.packets || 0
        },
        receive: {
          rate: data.statistics?.rx?.rate || 0,
          bytesPerSecond: data.statistics?.rx?.bytes || 0,
          packetsPerSecond: data.statistics?.rx?.packets || 0
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get Mimosa stats: ${error.message}`);
    }
  }

  parseUBNTOutput(output) {
    const lines = output.split('\n');
    const stats = {};

    lines.forEach(line => {
      const [key, value] = line.split('=').map(s => s.trim());
      if (key && value) {
        stats[key.toLowerCase()] = value;
      }
    });

    return stats;
  }

  async checkDeviceStatus(device) {
    let connection;
    try {
      connection = await this.connectToDevice(device);
      const statistics = await this.getDeviceStatistics(connection, device.type);
      return { 
        status: 'online', 
        statistics
      };
    } catch (error) {
      return { 
        status: 'offline', 
        error: error.message,
        statistics: null
      };
    } finally {
      if (connection && device.type === 'ubnt' && connection.end) {
        connection.end();
      }
    }
  }
}

module.exports = new DeviceService();