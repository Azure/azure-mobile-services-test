module.exports = function (configuration) {
    var auth = require('azure-mobile-apps/src/auth')(configuration.auth);

    return function (req, res, next) {
        var payload = {
            "ver": "3",
            "uid": "Facebook:someuserid@hotmail.com",
            "iss": "urn:microsoft:windows-azure:zumo",
            "aud": "urn:microsoft:windows-azure:zumo",
            "exp": 1440009424,
            "nbf": 1437417424
        };

        res.status(200).json({
            token: {
                payload: payload,
                rawData: auth.sign(payload)
            }
        });
    }
};
