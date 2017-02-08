//
// Copyright 2014, Evothings AB
//
// Licensed under the Apache License, Version 2.0 (the "License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// RedBearLab - Simple Control
// version: 0.4 - 2014-12-11
//

document.addEventListener(
	'deviceready',
	function() { 
		evothings.scriptsLoaded(app.initialize)
		console.log("Existing Address : " + permanentStorage.getItem("blueFruitAddr"))
		app.startScan( );
		setInterval(app.checkBattery,30000);
	},
	false);

var app = {};
var permanentStorage = window.localStorage;

var analog_enabled;

app.RBL_SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
app.RBL_CHAR_TX_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';
app.RBL_CHAR_RX_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
app.RBL_TX_UUID_DESCRIPTOR = '00002902-0000-1000-8000-00805f9b34fb';
app.checkBattery = function()
{
	if( app.connected)
	{
		app.sendData('bat');
	}
}

app.initialize = function()
{
	app.connected = false;
	analog_enabled = false
	;
};

app.startScan = function()
{
	app.disconnect();

	console.log('Scanning started...');

	app.devices = {};

	var htmlString =
		'<img src="img/loader_small.gif" style="display:inline; vertical-align:middle">' +
		'<p style="display:inline">   Scanning...</p>';

	$('#scanResultView').append($(htmlString));

	$('#scanResultView').show();

	function onScanSuccess(device)
	{
		if (device.name != null)
		{
			app.devices[device.address] = device;

			console.log('Found: ' + device.name + ', ' +
				device.address + ', ' + device.rssi);

			var htmlString =
				'<div class="deviceContainer" onclick="app.connectTo(\'' +
					device.address + '\')">' +
				'<p class="deviceName">' + device.name + '</p>' +
				'<p class="deviceAddress">' + device.address + '</p>' +
				'</div>';

			$('#scanResultView').append( $( htmlString ) );
			if( device.address == permanentStorage.getItem("blueFruitAddr"))
			{
				console.log("AutoConnect!");
				app.connectTo(device.address);
			}
		}
	}

	function onScanFailure(errorCode)
	{
		// Show an error message to the user
		app.disconnect('Failed to scan for devices.');

		// Write debug information to console.
		console.log('Error ' + errorCode);
	}

	evothings.easyble.reportDeviceOnce(true);
	evothings.easyble.startScan(onScanSuccess, onScanFailure);

	$('#startView').hide();
};

app.setLoadingLabel = function(message)
{
	console.log(message);
	$('#loadingStatus').text(message);
}

app.connectTo = function(address)
{
	device = app.devices[address];
	console.log("Connecting to " + address)
	$('#loadingView').css('display', 'table');

	app.setLoadingLabel('Trying to connect to ' + device.name);

	function onConnectSuccess(device)
	{
		
		function onServiceSuccess(device)
		{
			// Application is now connected
			app.connected = true;
			app.device = device;

			console.log('Connected to ' + device.name);
		
			
			device.writeDescriptor(
				app.RBL_CHAR_TX_UUID,
				app.RBL_TX_UUID_DESCRIPTOR,
				new Uint8Array([1,0]),
				function()
				{
					console.log('Status: writeDescriptor ok.');

					$('#loadingView').hide();
					$('#scanResultView').hide();
					$('#controlView').show();
					window.localStorage.setItem("blueFruitAddr", device.address);
					evothings.easyble.stopScan();
					 app.sendData("bat") ; //}, 1000);
				},
				function(errorCode)
				{
					// Disconnect and give user feedback.
					app.disconnect('Failed to set descriptor.');

					// Write debug information to console.
					console.log('Error: writeDescriptor: ' + errorCode + '.');
				}
			);

			function failedToEnableNotification(erroCode)
			{
				console.log('BLE enableNotification error: ' + errorCode);
			}

			device.enableNotification(
				app.RBL_CHAR_TX_UUID,
				app.receivedData,
				function(errorcode)
				{
					console.log('BLE enableNotification error: ' + errorCode);
				}
			);

		};

		function onServiceFailure(errorCode)
		{
			// Disconnect and show an error message to the user.
			app.disconnect('Device is not from RedBearLab');

			// Write debug information to console.
			console.log('Error reading services: ' + errorCode);
		};

		app.setLoadingLabel('Identifying services...');

		// Connect to the appropriate BLE service
		device.readServices(
			[app.RBL_SERVICE_UUID],
			onServiceSuccess,
			onServiceFailure
		);
	};

	function onConnectFailure(errorCode)
	{
		// Disconnect and show an error message to the user.
		app.disconnect('Disconnected from device');

		// Write debug information to console
		console.log('Error ' + errorCode);
	};

	// Stop scanning
	evothings.easyble.stopScan();

	// Connect to our device
	console.log('Identifying service for communication');
	device.connect(onConnectSuccess, onConnectFailure);
};

function str2byteArray(str) {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}


app.sendData = function(data)
{ 
	if (app.connected)
	{
		function onMessageSendSucces()
		{
			console.log('Succeded to send message : \'' + data + '\'' );
		}

		function onMessageSendFailure(errorCode)
		{
			console.log('Failed to send data with error: ' + errorCode);
			app.disconnect('Failed to send data');
		}
		
		
		var d = str2byteArray(data) ;//new Uint8Array( ['a'.charAt(),74,39]);
		app.device.writeCharacteristic(
			app.RBL_CHAR_RX_UUID,
			d,
			onMessageSendSucces,
			onMessageSendFailure
		);
	}
	else
	{
		// Disconnect and show an error message to the user.
		app.disconnect('Disconnected');

		// Write debug information to console
		console.log('Error - No device connected.');
	}
};

app.receivedData = function(data)
{
	if (app.connected)
	{
		data = String.fromCharCode.apply(null, new Uint8Array(data));
		console.log("Received data : "  + data);
		if(data.length > 0)
		{
			if( data[0] == "B")
			{
				var batteryLevel = data.split('#')[1];
				batteryLevel= parseInt(batteryLevel);
				$("#batteryLevel").html( (batteryLevel / 380 * 100).toFixed(1) + "%"  )
			}
			else
			{
				$("#infoContent").html(data + "<br/>" + $("#infoContent").html() );
			}
		}
	}
	else
	{
		// Disconnect and show an error message to the user.
		app.disconnect('Disconnected');

		// Write debug information to console
		console.log('Error - No device connected.');
	}
};

app.disconnect = function(errorMessage)
{
	if (errorMessage)
	{
		navigator.notification.alert(errorMessage, function() {});
	}

	app.connected = false;
	app.device = null;

	// Stop any ongoing scan and close devices.
	evothings.easyble.stopScan();
	evothings.easyble.closeConnectedDevices();

	console.log('Disconnected');

	$('#loadingView').hide();
	$('#scanResultView').hide();
	$('#scanResultView').empty();
	$('#controlView').hide();
	$('#startView').show();
};

