// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using Microsoft.Azure.Mobile.Server;
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
    public class RoundTripTableController : TableController<RoundTripTableItem>
    {
        SDKClientTestContext context;
        protected override void Initialize(HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            this.context = new SDKClientTestContext();
            this.DomainManager = new EntityDomainManager<RoundTripTableItem>(context, Request, Services);
        }

        public IQueryable<RoundTripTableItem> GetAll()
        {
            Services.Log.Info("GetAllRoundTrips");
            return Query();
        }

        public SingleResult<RoundTripTableItem> Get(string id)
        {
            Services.Log.Info("GetRoundTrip:" + id);
            return Lookup(id);
        }

        public async Task<RoundTripTableItem> Patch(string id, Delta<RoundTripTableItem> patch)
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
                    RoundTripTableItem serverItem = (RoundTripTableItem)content.Value;

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

        public Task<RoundTripTableItem> Post(RoundTripTableItem item)
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
            Services.Log.Info("DeleteRoundTrip:" + id);
            return DeleteAsync(id);
        }
    }
}