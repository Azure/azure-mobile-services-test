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

namespace ZumoE2EServerApp.Controllers
{
    public class SoftDeleteRoundTripTableController : TableController<SoftDeleteRoundTripTableItem>
    {
        SDKClientTestContext context;
        protected override void Initialize(HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            this.context = new SDKClientTestContext();
            this.DomainManager = new EntityDomainManager<SoftDeleteRoundTripTableItem>(context, Request, Services, enableSoftDelete: true);
        }

        public IQueryable<SoftDeleteRoundTripTableItem> GetAll()
        {
            Services.Log.Info("GetAllRoundTrips");
            return Query();
        }

        public SingleResult<SoftDeleteRoundTripTableItem> Get(string id)
        {
            Services.Log.Info("GetRoundTrip:" + id);
            return Lookup(id);
        }

        public async Task<SoftDeleteRoundTripTableItem> Patch(string id, Delta<SoftDeleteRoundTripTableItem> patch)
        {
            Services.Log.Info("PatchRoundTrip:" + id);
            const int NumAttempts = 5;

            HttpResponseException lastException = null;
            for (int i = 0; i < NumAttempts; i++)
            {
                try
                {
                    return await UpdateAsync(id, patch);
                }
                catch (HttpResponseException ex)
                {
                    lastException = ex;
                }

                if (lastException.Response != null && lastException.Response.StatusCode == HttpStatusCode.PreconditionFailed)
                {
                    // Handle conflict
                    var content = lastException.Response.Content as ObjectContent;
                    SoftDeleteRoundTripTableItem serverItem = (SoftDeleteRoundTripTableItem)content.Value;

                    KeyValuePair<string, string> kvp = this.Request.GetQueryNameValuePairs().FirstOrDefault(p => p.Key == "conflictPolicy");
                    if (kvp.Key == "conflictPolicy")
                    {
                        switch (kvp.Value)
                        {
                            case "clientWins":
                                Services.Log.Info("Client wins");
                                this.Request.Headers.IfMatch.Clear();
                                this.Request.Headers.IfMatch.Add(new EntityTagHeaderValue("\"" + Convert.ToBase64String(serverItem.Version) + "\""));
                                continue; // try again with the new ETag...
                            case "serverWins":
                                Services.Log.Info("Server wins");
                                return serverItem;
                        }
                    }
                }
                throw lastException;
            }

            throw lastException;
        }

        public Task<SoftDeleteRoundTripTableItem> Post(SoftDeleteRoundTripTableItem item)
        {
            if (string.IsNullOrWhiteSpace(item.Id))
            {
                item.Id = null;
            }

            Services.Log.Info("PostRoundTrip:" + item.Id);
            return InsertAsync(item);
        }

        public Task Delete(string id)
        {
            Services.Log.Info("SoftDeleteRoundTrip:" + id);
            return DeleteAsync(id);
        }
    }
}