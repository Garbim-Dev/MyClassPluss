import { Injectable } from '@nestjs/common';
import * as os from 'os';

export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  family: string;
  mac: string;
  isRecommended: boolean;
}

@Injectable()
export class NetworkService {
  getActiveInterfaces(): NetworkInterfaceInfo[] {
    const interfaces = os.networkInterfaces();
    const result: NetworkInterfaceInfo[] = [];

    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;

      for (const net of netList) {
        // Filtra para IPv4 e descarta loopback (127.0.0.1)
        const isIPv4 = net.family === 'IPv4' || (net as any).family === 4;
        if (isIPv4 && !net.internal) {
          // Detecta se é uma placa com cara de Wi-Fi ou Ethernet local comum
          const lowerName = name.toLowerCase();
          const isVirtual =
            lowerName.includes('vEthernet') ||
            lowerName.includes('virtual') ||
            lowerName.includes('docker') ||
            lowerName.includes('wsl');

          result.push({
            name,
            ip: net.address,
            family: 'IPv4',
            mac: net.mac,
            isRecommended: !isVirtual && (lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('eth')),
          });
        }
      }
    }

    return result;
  }
}