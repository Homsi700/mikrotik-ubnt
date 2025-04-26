import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Container,
  Paper,
  Toolbar,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { socket } from './socket';

const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: 'Arial, sans-serif'
  }
});

const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const API_BASE_URL = 'http://localhost:5000/api';

function WirelessDetails({ statistics, deviceType }) {
  if (!statistics?.wireless) return null;

  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
        معلومات الطبق اللاسلكي:
      </Typography>
      <Box sx={{ ml: 2 }}>
        <Typography variant="body2">
          قوة الإشارة: {statistics.wireless.signalStrength} dBm
        </Typography>
        {statistics.wireless.noiseFloor && (
          <Typography variant="body2">
            مستوى الضجيج: {statistics.wireless.noiseFloor} dBm
          </Typography>
        )}
        {deviceType === 'ubnt' && statistics.wireless.distance && (
          <Typography variant="body2">
            المسافة: {statistics.wireless.distance} كم
          </Typography>
        )}
        {deviceType === 'mimosa' && (
          <>
            <Typography variant="body2">
              عرض النطاق: {statistics.wireless.bandwidth} MHz
            </Typography>
            <Typography variant="body2">
              نوع التضمين: {statistics.wireless.modulation}
            </Typography>
          </>
        )}
        <Typography variant="body2">
          سرعة الإرسال: {statistics.wireless.txRate} Mbps
        </Typography>
        <Typography variant="body2">
          سرعة الاستقبال: {statistics.wireless.rxRate} Mbps
        </Typography>
        {statistics.wireless.ccq && (
          <Typography variant="body2">
            جودة الاتصال (CCQ): {statistics.wireless.ccq}%
          </Typography>
        )}
        {statistics.wireless.chainRssi && statistics.wireless.chainRssi.length > 0 && (
          <Box>
            <Typography variant="body2">قوة الإشارة لكل سلسلة:</Typography>
            {statistics.wireless.chainRssi.map((rssi, index) => (
              <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                سلسلة {index + 1}: {rssi} dBm
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    </>
  );
}

function DeviceCard({ device, monitoringDevices, toggleDeviceMonitoring, checkDeviceStatus }) {
  const hasTransmitStats = device.statistics?.transmit?.rate !== undefined;
  const hasReceiveStats = device.statistics?.receive?.rate !== undefined;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{device.name}</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={monitoringDevices.has(device._id)}
              onChange={() => toggleDeviceMonitoring(device._id)}
              color="primary"
            />
          }
          label="مراقبة مباشرة"
        />
      </Box>

      <Typography color="textSecondary">النوع: {device.type}</Typography>
      <Typography color="textSecondary">عنوان IP: {device.ipAddress}</Typography>
      <Typography color="textSecondary">
        الحالة: <span style={{ 
          color: device.status === 'online' ? 'green' : 
                 device.status === 'offline' ? 'red' : 'orange'
        }}>
          {device.status === 'online' ? 'متصل' : 
           device.status === 'offline' ? 'غير متصل' : 'قيد الفحص'}
        </span>
      </Typography>

      {device.statistics && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
            إحصائيات الاتصال:
          </Typography>
          <Box sx={{ ml: 2 }}>
            {hasTransmitStats && (
              <Typography variant="body2">
                الإرسال: {device.statistics.transmit.rate} Mbps
                {device.statistics.transmit.packetsPerSecond !== undefined && 
                  `(${device.statistics.transmit.packetsPerSecond} حزمة/ثانية)`
                }
              </Typography>
            )}
            {hasReceiveStats && (
              <Typography variant="body2">
                الاستقبال: {device.statistics.receive.rate} Mbps
                {device.statistics.receive.packetsPerSecond !== undefined && 
                  `(${device.statistics.receive.packetsPerSecond} حزمة/ثانية)`
                }
              </Typography>
            )}
          </Box>

          <WirelessDetails statistics={device.statistics} deviceType={device.type} />

          {device.type === 'mikrotik' && device.statistics.users && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>
                المستخدمين:
              </Typography>
              <Box sx={{ ml: 2 }}>
                <Typography variant="body2" sx={{ color: 'success.main' }}>
                  نشط: {device.statistics.users.active || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  غير نشط: {device.statistics.users.inactive || 0}
                </Typography>
                <Typography variant="body2">
                  المجموع: {device.statistics.users.total || 0}
                </Typography>
              </Box>
            </>
          )}

          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
            آخر تحديث: {new Date(device.statistics.lastUpdated).toLocaleString('ar-SA')}
          </Typography>
        </>
      )}

      <Button
        variant="contained"
        size="small"
        sx={{ mt: 2 }}
        onClick={() => checkDeviceStatus(device._id)}
        disabled={monitoringDevices.has(device._id)}
      >
        تحديث الحالة
      </Button>
    </Paper>
  );
}

function App() {
  const [devices, setDevices] = useState([]);
  const [open, setOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'mikrotik',
    ipAddress: '',
    username: '',
    password: '',
    port: '8728'
  });
  const [monitoringDevices, setMonitoringDevices] = useState(new Set());

  const fetchDevices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/devices`);
      setDevices(response.data);
    } catch (error) {
      console.error('خطأ في جلب الأجهزة:', error);
    }
  };

  useEffect(() => {
    fetchDevices();

    // Listen for real-time updates
    socket.on('deviceUpdate', ({ deviceId, status, statistics }) => {
      setDevices(prevDevices => 
        prevDevices.map(device => 
          device._id === deviceId 
            ? { ...device, status, statistics }
            : device
        )
      );
    });

    return () => {
      socket.off('deviceUpdate');
    };
  }, []);

  const handleAddDevice = async () => {
    try {
      await axios.post(`${API_BASE_URL}/devices`, newDevice);
      setOpen(false);
      setNewDevice({
        name: '',
        type: 'mikrotik',
        ipAddress: '',
        username: '',
        password: '',
        port: '8728'
      });
      fetchDevices();
    } catch (error) {
      console.error('خطأ في إضافة الجهاز:', error);
    }
  };

  const checkDeviceStatus = async (deviceId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/devices/${deviceId}/status`);
      const updatedDevices = devices.map(device => 
        device._id === deviceId ? { ...device, status: response.data.status, statistics: response.data.statistics } : device
      );
      setDevices(updatedDevices);
    } catch (error) {
      console.error('خطأ في فحص حالة الجهاز:', error);
    }
  };

  const toggleDeviceMonitoring = (deviceId) => {
    setMonitoringDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        socket.emit('stopMonitoring', deviceId);
        newSet.delete(deviceId);
      } else {
        socket.emit('startMonitoring', deviceId);
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <Box sx={{ flexGrow: 1, direction: 'rtl' }}>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                لوحة تحكم الأجهزة الشبكية
              </Typography>
              <IconButton color="inherit" onClick={fetchDevices}>
                <RefreshIcon />
              </IconButton>
              <Button color="inherit" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                إضافة جهاز
              </Button>
            </Toolbar>
          </AppBar>

          <Container sx={{ mt: 4 }}>
            <Grid container spacing={3}>
              {devices.map((device) => (
                <Grid item xs={12} md={6} lg={4} key={device._id}>
                  <DeviceCard
                    device={device}
                    monitoringDevices={monitoringDevices}
                    toggleDeviceMonitoring={toggleDeviceMonitoring}
                    checkDeviceStatus={checkDeviceStatus}
                  />
                </Grid>
              ))}
            </Grid>
          </Container>

          <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle>إضافة جهاز جديد</DialogTitle>
            <DialogContent>
              <TextField
                fullWidth
                label="اسم الجهاز"
                margin="normal"
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
              />
              <TextField
                select
                fullWidth
                label="نوع الجهاز"
                margin="normal"
                value={newDevice.type}
                onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
              >
                <MenuItem value="mikrotik">MikroTik</MenuItem>
                <MenuItem value="ubnt">UBNT</MenuItem>
                <MenuItem value="mimosa">Mimosa</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="عنوان IP"
                margin="normal"
                value={newDevice.ipAddress}
                onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
              />
              <TextField
                fullWidth
                label="اسم المستخدم"
                margin="normal"
                value={newDevice.username}
                onChange={(e) => setNewDevice({ ...newDevice, username: e.target.value })}
              />
              <TextField
                fullWidth
                label="كلمة المرور"
                type="password"
                margin="normal"
                value={newDevice.password}
                onChange={(e) => setNewDevice({ ...newDevice, password: e.target.value })}
              />
              <TextField
                fullWidth
                label="المنفذ"
                margin="normal"
                value={newDevice.port}
                onChange={(e) => setNewDevice({ ...newDevice, port: e.target.value })}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>إلغاء</Button>
              <Button onClick={handleAddDevice} variant="contained">إضافة</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}

export default App;
