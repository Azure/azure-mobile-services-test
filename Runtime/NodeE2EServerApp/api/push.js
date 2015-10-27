var bodyParser = require('body-parser'),
    promises = require('azure-mobile-apps/src/utilities/promises');

module.exports = {
    register: function (app) {
        app.post('/api/push', [bodyParser.json(), push]);
        app.get('/api/verifyRegisterInstallationResult', getVerifyRegisterInstallationResult);
        app.get('/api/verifyUnregisterInstallationResult', getVerifyUnregisterInstallationResult);
        app.delete('/api/deleteRegistrationsForChannel', deleteRegistrationsForChannel);
        app.post('/api/register', register);
    }
};

function push(req, res, next) {
    var data = req.body,
        push = req.azureMobile.push;

    switch(data.type) {
        case 'template':
            promises.wrap(push.send)(data.tag, data.payload).then(endRequest);
            break;
        case 'gcm':
            promises.wrap(push.gcm.send)(data.tag, data.payload).then(endRequest);
            break;
        case 'apns':
            promises.wrap(push.apns.send)(data.tag, data.payload).then(endRequest);
            break;
        case 'wns':
            promises.wrap(push.wns['send' + data.wnsType](data.tag, data.payload)).then(endRequest);
            break;
    }

    function endRequest() {
        res.status(200).end();
    }
}

function getVerifyRegisterInstallationResult(req, res, next) {
    var installationId = req.get('x-zumo-installation-id'),
        push = req.azureMobile.push;

    promises.wrap(push.getInstallation)(installationId).then(function (installation) {
        if(installation.Templates !== req.query.templates) {
            next('Templates did not match');
            return;
        }

        req.status(200).end();
    })
}

/*
var nhClient = this.GetNhClient();
HttpResponseMessage msg = new HttpResponseMessage();
msg.StatusCode = HttpStatusCode.InternalServerError;
IEnumerable<string> installationIds;
if (this.Request.Headers.TryGetValues("X-ZUMO-INSTALLATION-ID", out installationIds))
{
    return await Retry(async () =>
    {
        var installationId = installationIds.FirstOrDefault();

        Installation nhInstallation = await nhClient.GetInstallationAsync(installationId);
        string nhTemplates = null;
        string nhSecondaryTiles = null;

        if (nhInstallation.Templates != null)
        {
            nhTemplates = JsonConvert.SerializeObject(nhInstallation.Templates);
            nhTemplates = Regex.Replace(nhTemplates, @"\s+", String.Empty);
            templates = Regex.Replace(templates, @"\s+", String.Empty);
        }
        if (nhInstallation.SecondaryTiles != null)
        {
            nhSecondaryTiles = JsonConvert.SerializeObject(nhInstallation.SecondaryTiles);
            nhSecondaryTiles = Regex.Replace(nhSecondaryTiles, @"\s+", String.Empty);
            secondaryTiles = Regex.Replace(secondaryTiles, @"\s+", String.Empty);
        }
        if (nhInstallation.PushChannel.ToLower() != channelUri.ToLower())
        {
            msg.Content = new StringContent(string.Format("ChannelUri did not match. Expected {0} Found {1}", channelUri, nhInstallation.PushChannel));
            throw new HttpResponseException(msg);
        }
        if (templates != nhTemplates)
        {
            msg.Content = new StringContent(string.Format("Templates did not match. Expected {0} Found {1}", templates, nhTemplates));
            throw new HttpResponseException(msg);
        }
        if (secondaryTiles != nhSecondaryTiles)
        {
            msg.Content = new StringContent(string.Format("SecondaryTiles did not match. Expected {0} Found {1}", secondaryTiles, nhSecondaryTiles));
            throw new HttpResponseException(msg);
        }
        bool tagsVerified = await VerifyTags(channelUri, installationId, nhClient);
        if (!tagsVerified)
        {
            msg.Content = new StringContent("Did not find installationId tag");
            throw new HttpResponseException(msg);
        }
        return true;
    });
}
msg.Content = new StringContent("Did not find X-ZUMO-INSTALLATION-ID header in the incoming request");
throw new HttpResponseException(msg);
*/

function getVerifyUnregisterInstallationResult(req, res, next) {
    res.status(200).end();
}

function deleteRegistrationsForChannel(req, res, next) {
    res.status(200).end();
}

function register(req, res, next) {
    res.status(200).end();
}
