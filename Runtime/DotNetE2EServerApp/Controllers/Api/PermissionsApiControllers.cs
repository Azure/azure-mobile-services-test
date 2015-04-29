// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.Azure.Mobile.Security;
using Microsoft.Azure.Mobile.Server.Security;
using Newtonsoft.Json.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using ZumoE2EServerApp.Utils;

namespace ZumoE2EServerApp.Controllers
{
    public abstract class PermissionApiControllerBase : ApiController
    {
        public Task<HttpResponseMessage> Get()
        {
            return CustomSharedApi.handleRequest(this.Request, (ServiceUser)this.User);
        }

        public Task<HttpResponseMessage> Post()
        {
            return CustomSharedApi.handleRequest(this.Request, (ServiceUser)this.User);
        }

        public Task<HttpResponseMessage> Put()
        {
            return CustomSharedApi.handleRequest(this.Request, (ServiceUser)this.User);
        }

        public Task<HttpResponseMessage> Delete()
        {
            return CustomSharedApi.handleRequest(this.Request, (ServiceUser)this.User);
        }

        public Task<HttpResponseMessage> Patch()
        {
            return CustomSharedApi.handleRequest(this.Request, (ServiceUser)this.User);
        }
    }

    [AuthorizeLevel(AuthorizationLevel.Anonymous)]
    public class PublicPermissionController : PermissionApiControllerBase { }

    [AuthorizeLevel(AuthorizationLevel.Application)]
    public class ApplicationPermissionController : PermissionApiControllerBase { }

    [AuthorizeLevel(AuthorizationLevel.User)]
    public class UserPermissionController : PermissionApiControllerBase { }

    [AuthorizeLevel(AuthorizationLevel.Admin)]
    public class AdminPermissionController : PermissionApiControllerBase { }
}
