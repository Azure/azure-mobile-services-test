// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

#import "ZumoDaylightConnection.h"
#import "ZumoTestGlobals.h"

@interface ZumoDaylightConnection()

@property (nonatomic, strong) NSString *testRunName;
@property (nonatomic, strong) NSString *projectName;
@property (nonatomic, strong) NSString *clientId;
@property (nonatomic, strong) NSString *clientSecret;
@property (nonatomic, strong) NSString *accessToken;
@property (nonatomic, strong) NSString *blobAccessToken;
@property (nonatomic, strong) NSString *blobUrl;

@end


@implementation ZumoDaylightConnection

-(id) initWithName:(NSString *)name forProject:(NSString *)project withId:(NSString *)clientId andSecret:(NSString *)clientSecret
{
    self = [super init];
    if (self) {
        _testRunName = name;
        _clientId = clientId;
        _clientSecret = clientSecret;
        _projectName = project;
    }
    return self;
}

-(void) generateAccessTokenWithCompletion:(void(^)(NSError *))completion;
{
    NSLog(@"Requesting access token from daylight...");
    
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc] initWithURL:[NSURL URLWithString:@"https://www.daylightapp.net/oauth2/token"]];
    request.HTTPMethod = @"POST";
    
    [request addValue:@"application/x-www-form-urlencoded" forHTTPHeaderField:@"Content-Type"];
    [request addValue:@"application/json" forHTTPHeaderField:@"Accept"];
    
    NSString *accessRequest = [NSString stringWithFormat:@"grant_type=client_credentials&client_id=%@&client_secret=%@", self.clientId, self.clientSecret];
    request.HTTPBody = [accessRequest dataUsingEncoding:NSUTF8StringEncoding];
    
    NSURLSession *session = [NSURLSession sharedSession];
    [[session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        NSLog(@"Got response %@ with error %@.\n", response, error);
        
        if (error) {
            completion(error);
            return;
        }
        
        NSError *jsonError;
        NSDictionary *result = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
        if (jsonError) {
            completion(jsonError);
            return;
        } else if (result) {
            self.accessToken = [NSString stringWithFormat:@"%@ %@", result[@"token_type"], result[@"access_token"]];
        }
        
        completion(nil);
    }] resume];
}

-(void) createRunWithCount:(NSInteger)count completion:(void(^)(NSString *runId))completion
{
    // Get an access token as needed
    if (!self.accessToken) {
        dispatch_group_t group = dispatch_group_create();
        dispatch_group_enter(group);
        [self generateAccessTokenWithCompletion:^(NSError *error) {
            dispatch_group_leave(group);
        }];
        dispatch_group_wait(group, DISPATCH_TIME_FOREVER);
    }
    
    // Now request a run Id
    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"https://www.daylightapp.net/api/%@/runs", self.projectName]];
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc] initWithURL:url];
    
    request.HTTPMethod = @"POST";
    [request addValue:self.accessToken forHTTPHeaderField:@"Authorization"];
    [request addValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    
    NSError *error;
    NSDictionary *newRun = @{
                             @"name":self.testRunName,
                             @"version_spec":@{
                                     @"project_name":self.projectName,
                                     @"branch_name":@"1.1",
                                     @"revision":[ZumoTestGlobals dateToString:[NSDate date]]
                                     },
                             @"tags":@[@"iOS"],
                             @"test_count":[NSNumber numberWithInteger:count]
                             };
    
    request.HTTPBody = [NSJSONSerialization dataWithJSONObject:newRun options:0 error:&error];
    NSURLSession *session = [NSURLSession sharedSession];
    
    [[session dataTaskWithRequest:request
                completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
                    NSLog(@"Got response %@ with error %@.\n", response, error);
                    NSLog(@"DATA:\n%@\nEND DATA\n", [[NSString alloc] initWithData: data encoding: NSUTF8StringEncoding]);
                   
                    NSString *runId;
                    if (!error) {
                        NSDictionary *run = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
                        runId = run[@"run_id"];
                    }
                    completion(runId);
                }] resume];
}

-(void) reportTestResult:(NSArray *)testResult completion:(void(^)(NSError *error))completion
{
    if (!self.accessToken) {
        NSError *error = [[NSError alloc] initWithDomain:@"Zumo" code:-100 userInfo:nil];
        completion(error);
    }
    
    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"https://www.daylightapp.net/api/%@/results", self.projectName]];
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc] initWithURL:url];
    
    request.HTTPMethod = @"POST";
    [request addValue:self.accessToken forHTTPHeaderField:@"Authorization"];
    [request addValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    
    NSError *error;
    request.HTTPBody = [NSJSONSerialization dataWithJSONObject:testResult options:0 error:&error];
    
    if (error) {
        completion(error);
    }
    
    NSURLSession *session = [NSURLSession sharedSession];
    [[session dataTaskWithRequest:request
                completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
                    NSLog(@"Got response %@ with error %@.\n", response, error);
                    NSLog(@"DATA:\n%@\nEND DATA\n", [[NSString alloc] initWithData: data encoding: NSUTF8StringEncoding]);
                    completion(nil);
                }] resume];
}


#pragma mark Blob Storage Access


-(void) generateBlobAccessTokenWithCompletion:(void(^)(NSError *))completion;
{
    if (!self.accessToken) {
        NSError *error = [[NSError alloc] initWithDomain:@"Zumo" code:-100 userInfo:nil];
        completion(error);
    }
    
    NSLog(@"Requesting blob access token from daylight...");

    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"https://www.daylightapp.net/api/%@/storageaccounts/token", self.projectName]];
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc] initWithURL:url];
    
    request.HTTPMethod = @"POST";
    
    [request addValue:self.accessToken forHTTPHeaderField:@"Authorization"];
    [request addValue:@"application/x-www-form-urlencoded" forHTTPHeaderField:@"Content-Type"];
    [request addValue:@"application/json" forHTTPHeaderField:@"Accept"];
    
    NSString *accessRequest = @"grant_type=urn%3Adaylight%3Aoauth2%3Ashared-access-signature&permissions=rwdl&scope=attachments";
    request.HTTPBody = [accessRequest dataUsingEncoding:NSUTF8StringEncoding];
    
    NSURLSession *session = [NSURLSession sharedSession];
    [[session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        NSLog(@"Got response %@ with error %@.\n", response, error);
        
        if (error) {
            completion(error);
            return;
        }
        
        NSError *jsonError;
        NSDictionary *result = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
        if (jsonError) {
            completion(jsonError);
            return;
        } else if (result) {
            self.blobAccessToken = result[@"access_token"];
            self.blobUrl = result[@"container_uri"];
        }
        
        completion(nil);
    }] resume];
}

-(NSString *) uploadLog:(NSArray *)log completion:(void(^)(NSError *error))completion
{
    // Get an access token as needed
    __block NSError *accessTokenError;
    if (!self.blobAccessToken) {
        dispatch_group_t group = dispatch_group_create();
        dispatch_group_enter(group);
        [self generateBlobAccessTokenWithCompletion:^(NSError *error) {
            accessTokenError = error;
            dispatch_group_leave(group);
        }];
        dispatch_group_wait(group, DISPATCH_TIME_FOREVER);
    }
    
    if (accessTokenError) {
        completion(accessTokenError);
    }
    
    NSLog(@"Uploading log to blob...");
    
    CFUUIDRef newUUID = CFUUIDCreate(kCFAllocatorDefault);
    NSString *fileName = (__bridge_transfer NSString *)CFUUIDCreateString(kCFAllocatorDefault, newUUID);
    CFRelease(newUUID);

    NSURL *url = [NSURL URLWithString:[self.blobUrl stringByAppendingFormat:@"/%@?%@&api-version=2014-02-14", fileName, self.blobAccessToken]];
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc] initWithURL:url];
    request.HTTPMethod = @"PUT";
    
    [request addValue:@"application/json" forHTTPHeaderField:@"Accept"];
    [request addValue:@"BlockBlob" forHTTPHeaderField:@"x-ms-blob-type"];
    
    NSData *data = [[log componentsJoinedByString:@"\n"] dataUsingEncoding:NSUTF8StringEncoding];
    
    NSURLSession *session = [NSURLSession sharedSession];
    [[session uploadTaskWithRequest:request
                          fromData:data
                 completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
                     NSLog(@"Got response %@ with error %@.\n", response, error);
                     NSLog(@"DATA:\n%@\nEND DATA\n", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]);
                     
                 }] resume];
    
    
    return fileName;
}

+(unsigned long long) fileTime:(NSDate *)time
{
    return 116444736000000000LL + (time.timeIntervalSince1970 * 10000000LL);
}



@end
