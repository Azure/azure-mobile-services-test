// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.OData;
using Microsoft.Azure.Mobile.Security;
using Microsoft.Azure.Mobile.Server.Security;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ZumoE2EServerApp.DataObjects;

namespace ZumoE2EServerApp.Controllers
{
    [AuthorizeLevel(AuthorizationLevel.User)]
    public class AuthenticatedController : PermissionTableControllerBase
    {
        public override async Task<IQueryable<TestUser>> GetAll()
        {
            ServiceUser user = (ServiceUser)this.User;
            var all = (await base.GetAll()).Where(p => p.UserId == user.Id).ToArray();

            //var ids = await user.GetIdentitiesAsync();
            //var identities = ids.Where(q => q.Provider == "urn:microsoft:credentials").Select(p => p.UserId).ToArray();
            var identitiesOld = user.Identities.Select(q => q.Claims.First(p => p.Type == "urn:microsoft:credentials").Value).ToArray();
            foreach (var item in all)
            {
                item.Identities = identitiesOld;
            }

            return all.AsQueryable();
        }

        public override async Task<SingleResult<TestUser>> Get(string id)
        {
            return SingleResult.Create((await GetAll()).Where(p => p.Id == id));
        }

        public override async Task<HttpResponseMessage> Patch(string id, Delta<TestUser> patch)
        {
            ServiceUser user = (ServiceUser)this.User;
            var all = (await base.GetAll()).Where(p => p.UserId == user.Id).ToArray();
            if (all.Length == 0)
            {
                return this.Request.CreateResponse(HttpStatusCode.NotFound);
            }
            else if (all[0].UserId != user.Id)
            {
                return this.Request.CreateResponse(HttpStatusCode.BadRequest, new JObject(new JProperty("error", "Mismatching user id")));
            }
            else
            {
                return await base.Patch(id, patch);
            }
        }

        public override Task<HttpResponseMessage> Post(TestUser item)
        {
            ServiceUser user = (ServiceUser)this.User;
            item.UserId = user.Id;
            return base.Post(item);
        }

        public override async Task<HttpResponseMessage> Delete(string id)
        {
            ServiceUser user = (ServiceUser)this.User;
            var all = (await base.GetAll()).Where(p => p.UserId == user.Id).ToArray();
            if (all.Length == 0)
            {
                return this.Request.CreateResponse(HttpStatusCode.NotFound);
            }
            else if (all[0].UserId != user.Id)
            {
                return this.Request.CreateResponse(HttpStatusCode.BadRequest, new JObject(new JProperty("error", "Mismatching user id")));
            }
            else
            {
                return await base.Delete(id);
            }
        }
    }
}