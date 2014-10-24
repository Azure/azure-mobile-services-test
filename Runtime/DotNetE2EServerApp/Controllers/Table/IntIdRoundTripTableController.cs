// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.WindowsAzure.Mobile.Service;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Http;
using System.Web.Http.Controllers;
using System.Web.Http.OData;
using ZumoE2EServerApp.DataObjects;
using ZumoE2EServerApp.Models;
using ZumoE2EServerApp.Utils;

namespace ZumoE2EServerApp.Controllers
{
    public class IntIdRoundTripTableController : TableController<IntIdRoundTripTableItemDto>
    {
        protected override void Initialize(HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            var context = new SDKClientTestContext();

            this.DomainManager = new Int64IdMappedEntityDomainManager<IntIdRoundTripTableItemDto, IntIdRoundTripTableItem>(context, Request, Services);
        }

        public IQueryable<IntIdRoundTripTableItemDto> GetAllRoundTrips()
        {
            Services.Log.Info("IntId:GetAllRoundTrips");
            return Query();
        }

        public SingleResult<IntIdRoundTripTableItemDto> GetRoundTrip(int id)
        {
            Services.Log.Info("IntId:GetRoundTrip:" + id.ToString());
            return Lookup(id.ToString());
        }

        public Task<IntIdRoundTripTableItemDto> PatchRoundTrip(int id, Delta<IntIdRoundTripTableItemDto> patch)
        {
            Services.Log.Info("IntId:PatchRoundTrip:" + id.ToString());
            return UpdateAsync(id.ToString(), patch);
        }

        public Task<IntIdRoundTripTableItemDto> PostRoundTrip(IntIdRoundTripTableItemDto item)
        {
            Services.Log.Info("IntId:PostRoundTrip:" + item.Id);
            return InsertAsync(item);
        }

        public Task DeleteRoundTrip(int id)
        {
            Services.Log.Info("IntId:DeleteRoundTrip:" + id.ToString());
            return DeleteAsync(id.ToString());
        }
    }
}