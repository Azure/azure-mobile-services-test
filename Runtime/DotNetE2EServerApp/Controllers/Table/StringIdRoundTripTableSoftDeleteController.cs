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
using System;
using System.Net.Http;
using System.Net;
using System.Collections.Generic;
using System.Net.Http.Headers;
using Microsoft.WindowsAzure.Mobile.Service.Security;

namespace ZumoE2EServerApp.Controllers
{
    public class StringIdRoundTripTableSoftDeleteController : TableController<StringIdRoundTripTableSoftDeleteItem>
    {
        SDKClientTestContext context;
        protected override void Initialize(HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            this.context = new SDKClientTestContext();
            this.DomainManager = new EntityDomainManager<StringIdRoundTripTableSoftDeleteItem>(context, Request, Services, enableSoftDelete: true);
        }

        public IQueryable<StringIdRoundTripTableSoftDeleteItem> GetAll()
        {
            Services.Log.Info("GetAllRoundTrips");
            return Query();
        }

        public SingleResult<StringIdRoundTripTableSoftDeleteItem> Get(string id)
        {
            Services.Log.Info("GetRoundTrip:" + id);
            return Lookup(id);
        }

        public Task<StringIdRoundTripTableSoftDeleteItem> Patch(string id, Delta<StringIdRoundTripTableSoftDeleteItem> patch)
        {
            Services.Log.Info("PatchRoundTrip:" + id);
            return UpdateAsync(id, patch);
        }

        public Task<StringIdRoundTripTableSoftDeleteItem> Post(StringIdRoundTripTableSoftDeleteItem item)
        {
            if (string.IsNullOrWhiteSpace(item.Id))
            {
                item.Id = null;
            }

            Services.Log.Info("PostRoundTrip:" + item.Id);
            return InsertAsync(item);
        }

        public Task<StringIdRoundTripTableSoftDeleteItem> PostUndeleteStringIdRoundTripTableSoftDeleteItem(string id)
        {
            return this.UndeleteAsync(id);
        }

        public Task Delete(string id)
        {
            Services.Log.Info("SoftDeleteRoundTrip:" + id);
            return DeleteAsync(id);
        }
    }
}