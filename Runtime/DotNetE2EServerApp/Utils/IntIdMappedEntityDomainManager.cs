using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Linq.Expressions;
using System.Net.Http;
using System.Reflection;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;
using System.Web.Http.OData;
using AutoMapper;
using AutoMapper.Impl;
using Microsoft.Azure.Mobile.Server;
using Microsoft.Azure.Mobile.Server.Tables;

namespace ZumoE2EServerApp.Utils
{
    public class Int64IdMappedEntityDomainManager<TData, TModel>
        : MappedEntityDomainManager<TData, TModel>
        where TData : class, ITableData
        where TModel : class, IInt64IdTable
    {
        public Int64IdMappedEntityDomainManager(DbContext context, HttpRequestMessage request)
            : base(context, request)
        {
        }

        public override SingleResult<TData> Lookup(string id)
        {
            long intId = ConvertId(id);
            return this.LookupEntity(dbObject => dbObject.Id == intId);
        }

        public override Task<TData> UpdateAsync(string id, Delta<TData> patch)
        {
            return this.UpdateEntityAsync(patch, ConvertId(id));
        }

        public override Task<bool> DeleteAsync(string id)
        {
            return this.DeleteItemAsync(ConvertId(id));
        }

        private long ConvertId(string id)
        {
            return Convert.ToInt64(id);
        }
    }
}