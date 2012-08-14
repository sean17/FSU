var firmata = require('firmata');
var http = require('http');
var url = require('url');
var fs = require('fs')
var currentBoard;
var isOn = true;
var soundPin = 3;
var servoPin = 5;
var rgb = "FF0000";
var servoSpeed = 1000;
var soundFrequency = 200;
var sirenDuration = 30000;
var port = process.env.NODE_PORT || 9892;
var host = process.env.NODE_HOST || '0.0.0.0';
var util = require('util');
var routes = {
	'/' : serveHTML,
	'/on' : on,
	'/off' : off,
	'/siren': siren,
	'/color':color,
	'/tone':tone
};

function on() {
	isOn = true;
	console.log("turning on");
	res.statusCode = 200;
	res.end();
}

function off() {
	isOn = false;
	console.log("turning off");
	res.statusCode = 200;
	res.end();
}

function serveHTML(req, res, body) {
 // Route it
	fs.readFile("./arduino.html", function (err, data) {
		if (err) {
			res.statusCode = 404;
			return res.end();
		}
		res.end(data);
	});
}

function color (req, res, body){
	rgb = body;
	res.statusCode = 200;
	res.end();
}

function tone (req, res, body) {
	soundFrequency = body;
	res.statusCode = 200;
	res.end();
}

function rotate () {

}

function test () {

}

function siren (req, res, body) {
	res.statusCode = 200;
	res.end();
	if(isOn) {
		console.log(currentBoard);
		var board = currentBoard;
		var servoIntervalId;
		var degrees = 0;
		console.log(board);
		if (servoSpeed) {
			console.log("running servo");
			board.pinMode(servoPin,board.MODES.SERVO);
			board.servoWrite(servoPin,20);
			servoIntervalId = setInterval(function(){
				if(degrees >= 160){
					board.servoWrite(servoPin, 20);
					degrees = 20;
				} else {
					board.servoWrite(servoPin, 160);
					degrees = 160;
				}
			},servoSpeed);
		}

		if(rgb != "FFFFFF") {
			var commandArray = [0x6e];
			for(var i = 0; i < 6; i +=2) {
				commandArray.push("0x" + rgb[i] + rgb[i+1]);
			}
			board.sendI2CWriteRequest(0x09, commandArray);
		}

		if(soundFrequency) {
			board.analogWrite(soundPin, soundFrequency);
		}

		setTimeout(function () {
			if(servoIntervalId) {
				clearInterval(servoIntervalId);
				board.pinMode(servoPin, board.MODES.INPUT);
			}

			//set color to FFFFFF
			board.sendI2CWriteRequest(0x09, [0x6e, 0x00, 0x00, 0x00]);
			//set sound to 0;
			board.analogWrite(soundPin, 0);

		}, sirenDuration);
	}
}

var server = firmata.createServer(function(board){
	currentBoard = board;
	board.pinMode(soundPin, board.MODES.PWM);
	board.sendI2CConfig();
	board.sendI2CWriteRequest(0x09, [0x6f]);
	board.sendI2CWriteRequest(0x09, [0x6e, 0x00, 0x00, 0x00]);
});
server.listen(3030,function(){
	console.log('listening');
});

http.createServer(function(req, res) {
    var uri, body;
    // Log it
    process.stdout.write(util.format('[%s] [%s] request received from %s for %s ',
        Date(), req.method, req.connection.remoteAddress, req.url));

    // Check methods
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.statusCode = 501;
        console.log('[%d]', res.statusCode);
        return res.end();
    }

    // Extract the URL
    uri = url.parse(req.url);
    route = routes[uri.pathname];

    // Route not found
    if (!route) {
        res.statusCode = 404;
        console.log('[%d]', res.statusCode);
        res.write('Page not found');
        return res.end();
    }
    console.log();

    // Check post data
    body = '';
    req.on('data', function(chunk) {
        body += chunk;
    });
    req.on('end', function() {
        // Route it
        //body = (body) ? querystring.parse(body) : null;
        return route(req, res, body);
    });

}).listen(port, host, function() {
    console.log('Server started on http://%s:%d', host, port);
});