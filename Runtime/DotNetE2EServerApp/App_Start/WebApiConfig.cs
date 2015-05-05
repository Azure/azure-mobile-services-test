// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System;
using System.Collections;
using System.Data.Entity;
using System.Linq;
using System.Web.Http;
using ZumoE2EServerApp.DataObjects;
using ZumoE2EServerApp.Models;
using ZumoE2EServerApp.Utils;
using System.Web.Http.Cors;
using AutoMapper;
using Microsoft.Azure.Mobile.Server;
using Microsoft.Azure.Mobile.Server.AppService.Config;
using Microsoft.Azure.Mobile.Server.Config;
using Newtonsoft.Json;
using System.Web.Http.Cors;

namespace ZumoE2EServerApp
{
    public static class WebApiConfig
    {
        public static void Register()
        {
            AppServiceExtensionConfig.Initialize();

            ConfigOptions options = new ConfigOptions();
            
            HttpConfiguration config = ServiceConfig.Initialize(new ConfigBuilder(options));

            // Now add any missing connection strings and app settings from the environment.
            // Any envrionment variables found with names that match existing connection
            // string and app setting names will be used to replace the value.
            // This allows the Web.config (which typically would contain secrets) to be
            // checked in, but requires people running the tests to config their environment.
            IServiceSettingsProvider settingsProvider = config.DependencyResolver.GetServiceSettingsProvider();
            ServiceSettingsDictionary settings = settingsProvider.GetServiceSettings();
            IDictionary environmentVariables = Environment.GetEnvironmentVariables();
            foreach (var conKey in settings.Connections.Keys.ToArray())
            {
                var envKey = environmentVariables.Keys.OfType<string>().FirstOrDefault(p => p == conKey);
                if (!string.IsNullOrEmpty(envKey))
                {
                    settings.Connections[conKey].ConnectionString = (string)environmentVariables[envKey];
                }
            }

            foreach (var setKey in settings.Keys.ToArray())
            {
                var envKey = environmentVariables.Keys.OfType<string>().FirstOrDefault(p => p == setKey);
                if (!string.IsNullOrEmpty(envKey))
                {
                    settings[setKey] = (string)environmentVariables[envKey];
                }
            }

            // Emulate the auth behavior of the server: default is application unless explicitly set.
            config.Properties["MS_IsHosted"] = true;

            config.Formatters.JsonFormatter.SerializerSettings.DateFormatHandling = DateFormatHandling.IsoDateFormat;

            Mapper.Initialize(cfg =>
            {
                cfg.CreateMap<IntIdRoundTripTableItem, IntIdRoundTripTableItemDto>()
                   .ForMember(dto => dto.Id, map => map.MapFrom(db => MySqlFuncs.LTRIM(MySqlFuncs.StringConvert(db.Id))));
                cfg.CreateMap<IntIdRoundTripTableItemDto, IntIdRoundTripTableItem>()
                   .ForMember(db => db.Id, map => map.MapFrom(dto => MySqlFuncs.LongParse(dto.Id)));

                cfg.CreateMap<IntIdMovie, IntIdMovieDto>()
                   .ForMember(dto => dto.Id, map => map.MapFrom(db => MySqlFuncs.LTRIM(MySqlFuncs.StringConvert(db.Id))));
                cfg.CreateMap<IntIdMovieDto, IntIdMovie>()
                   .ForMember(db => db.Id, map => map.MapFrom(dto => MySqlFuncs.LongParse(dto.Id)));

            });

            Database.SetInitializer(new DbInitializer());
        }

        class DbInitializer : ClearDatabaseSchemaAlways<SDKClientTestContext>
        {
            protected override void Seed(SDKClientTestContext context)
            {
                foreach (var movie in TestMovies.GetTestMovies())
                {
                    context.Set<Movie>().Add(movie);
                }
                foreach (var movie in TestMovies.TestIntIdMovies)
                {
                    context.Set<IntIdMovie>().Add(movie);
                }

                base.Seed(context);
            }
        }
    }
}
