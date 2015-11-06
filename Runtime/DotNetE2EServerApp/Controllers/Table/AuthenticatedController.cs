// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Security.Principal;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.OData;
using Microsoft.Azure.Mobile.Server.Authentication;
using Newtonsoft.Json.Linq;
using ZumoE2EServerApp.DataObjects;

namespace ZumoE2EServerApp.Controllers
{
    [Authorize]
    public class AuthenticatedController : PermissionTableControllerBase
    {
        public override async Task<IQueryable<TestUser>> GetAll()
        {
            ClaimsPrincipal user = this.User as ClaimsPrincipal;

            var creds = await user.GetAppServiceIdentityAsync<FacebookCredentials>(this.Request);
            var all = (await base.GetAll()).Where(p => p.UserId == creds.UserId).ToArray();

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
            ClaimsPrincipal user = this.User as ClaimsPrincipal;

            Claim userIdClaim = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            string userId = (userIdClaim != null) ? userIdClaim.Value : string.Empty;

            var all = (await base.GetAll()).Where(p => p.UserId == userId).ToArray();
            if (all.Length == 0)
            {
                return this.Request.CreateResponse(HttpStatusCode.NotFound);
            }
            else if (all[0].UserId != userId)
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
            ClaimsPrincipal user = this.User as ClaimsPrincipal;

            Claim userIdClaim = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            string userId = (userIdClaim != null) ? userIdClaim.Value : string.Empty;
            item.UserId = userId;
            return base.Post(item);
        }

        public override async Task<HttpResponseMessage> Delete(string id)
        {
            ClaimsPrincipal user = this.User as ClaimsPrincipal;

            Claim userIdClaim = user.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            string userId = (userIdClaim != null) ? userIdClaim.Value : string.Empty;

            var all = (await base.GetAll()).Where(p => p.UserId == userId).ToArray();
            if (all.Length == 0)
            {
                return this.Request.CreateResponse(HttpStatusCode.NotFound);
            }
            else if (all[0].UserId != userId)
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