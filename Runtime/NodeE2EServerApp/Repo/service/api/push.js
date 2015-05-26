exports.post = function(request, response) {
    var method = request.body.method,
        push = request.service.push,
        callbacks = {
            success: success,
            error: error
        };
        
    if (!method) {
        response.send(400, { error: 'request must have a \'method\' member' });
        return;
    }
    
    if (method == 'send') {
        var token = request.body.token,
            payload = request.body.payload,
            delay = request.body.delay || 0,
            pushType = request.body.pushType,
            tag = request.body.tag;
            
        if (!payload || !token) {
            response.send(400, { error: 'request must have a \'payload\' and a \'token\' members for sending push notifications.' });
        } else {
            console.log('sending push');
            var sendPush = function() {
                if (request.body.type == 'template') {
                    push.send(tag, request.body.payload, callbacks);
                } else if (request.body.type == 'gcm') {
                    push.gcm.send(token, JSON.stringify(payload), callbacks);                    
                } else if (request.body.type == 'apns') {
                    push.apns.send(token, payload, callbacks);
                } else if (request.body.type == 'wns') {
                    push.wns.send(tag, payload, 'wns/' + pushType, callbacks);
                }
            };
            
            if (delay) {
                setTimeout(sendPush, delay);
            } else {
                sendPush();
            }
            
            response.send(200, { id: 1, status: 'Push sent' });
        }
    } else {
        response.send(400, { error: 'valid values for the \'method\' parameter are \'send\' and \'getFeedback\'.' });
    }
};    

function error(err) {
    console.warn('Error sending push notification: ', err);
}

function success(pushResponse) {
    console.log('Successfully sent push: ', pushResponse);
}