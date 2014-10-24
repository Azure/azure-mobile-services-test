// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

#import "ZumoLoginTests.h"
#import "ZumoTest.h"
#import "ZumoTestGlobals.h"
#import <WindowsAzureMobileServices/WindowsAzureMobileServices.h>

@interface TimerTarget : NSObject
{
    ZumoTest *test;
    ZumoTestCompletion completion;
}

- (id)initWithTest:(ZumoTest *)test completion:(ZumoTestCompletion)completion;
- (void)completeTest:(NSTimer *)timer;

@end

@implementation TimerTarget

- (id)initWithTest:(ZumoTest *)theTest completion:(ZumoTestCompletion)completionBlock {
    self = [super init];
    if (self) {
        self->test = theTest;
        self->completion = completionBlock;
    }
    
    return self;
}

- (void)completeTest:(NSTimer *)timer {
    [test addLog:@"Timer fired, completing the test"];
    [test setTestStatus:TSPassed];
    completion(YES);
}

@end

@implementation ZumoLoginTests

static NSString *lastUserIdentityObjectKey = @"lastUserIdentityObject";

+ (NSArray *)createTests {
    NSMutableArray *result = [[NSMutableArray alloc] init];
    [result addObject:[self createClearAuthCookiesTest]];
    [result addObject:[self createLogoutTest]];
    [result addObject:[self createCRUDTestForProvider:nil forTable:@"application" ofType:ZumoTableApplication andAuthenticated:NO]];
    [result addObject:[self createCRUDTestForProvider:nil forTable:@"authenticated" ofType:ZumoTableAuthenticated andAuthenticated:NO]];
    [result addObject:[self createCRUDTestForProvider:nil forTable:@"admin" ofType:ZumoTableAdminScripts andAuthenticated:NO]];
    
    NSInteger indexOfLastUnattendedTest = [result count];
    
    NSArray *providers = @[@"facebook", @"google", @"twitter", @"microsoftaccount"];
    NSArray *providersWithRecycledTokenSupport = @[@"facebook"]; //, @"google"]; Known bug - Drop login via Google token until Google client flow is reintroduced
    NSString *provider;
    
    for (int useSimplifiedLogin = 0; useSimplifiedLogin <= 1; useSimplifiedLogin++) {
        for (provider in providers) {
            BOOL useSimplified = useSimplifiedLogin == 1;
            [result addObject:[self createLogoutTest]];
            [result addObject:[self createSleepTest:3]];
            [result addObject:[self createLoginTestForProvider:provider usingSimplifiedMode:useSimplified]];
            [result addObject:[self createCRUDTestForProvider:provider forTable:@"application" ofType:ZumoTableApplication andAuthenticated:YES]];
            [result addObject:[self createCRUDTestForProvider:provider forTable:@"authenticated" ofType:ZumoTableAuthenticated andAuthenticated:YES]];
            [result addObject:[self createCRUDTestForProvider:provider forTable:@"admin" ofType:ZumoTableAdminScripts andAuthenticated:YES]];
            
            if ([providersWithRecycledTokenSupport containsObject:provider]) {
                [result addObject:[self createLogoutTest]];
                [result addObject:[self createSleepTest:1]];
                [result addObject:[self createClientSideLoginWithProvider:provider]];
                [result addObject:[self createCRUDTestForProvider:provider forTable:@"authenticated" ofType:ZumoTableAuthenticated andAuthenticated:YES]];
            }
        }
    }

    for (NSInteger i = indexOfLastUnattendedTest; i < [result count]; i++) {
        ZumoTest *test = result[i];
        [test setCanRunUnattended:NO];
    }
    
    [result addObject:[self createLogoutTest]];

    return result;
}

typedef enum { ZumoTableUnauthenticated, ZumoTableApplication, ZumoTableAuthenticated, ZumoTableAdminScripts } ZumoTableType;

+ (ZumoTest *)createSleepTest:(int)seconds {
    NSString *testName = [NSString stringWithFormat:@"Sleep for %d seconds", seconds];
    return [ZumoTest createTestWithName:testName andExecution:^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        [test addLog:@"Starting the timer"];
        TimerTarget *timerTarget = [[TimerTarget alloc] initWithTest:test completion:completion];
        NSTimer *timer = [NSTimer scheduledTimerWithTimeInterval:seconds target:timerTarget selector:@selector(completeTest:) userInfo:nil repeats:NO];
        [test addLog:[NSString stringWithFormat:@"Timer fire date: %@", [timer fireDate]]];
    }];
}

+ (ZumoTest *)createCRUDTestForProvider:(NSString *)providerName forTable:(NSString *)tableName ofType:(ZumoTableType)tableType andAuthenticated:(BOOL)isAuthenticated {
    NSString *tableTypeName;
    switch (tableType) {
        case ZumoTableAdminScripts:
            tableTypeName = @"admin";
            break;
            
        case ZumoTableApplication:
            tableTypeName = @"application";
            break;
            
        case ZumoTableAuthenticated:
            tableTypeName = @"authenticated users";
            break;
            
        default:
            tableTypeName = @"public";
            break;
    }
    
    if (!providerName) {
        providerName = @"no";
    }
    
    NSString *testName = [NSString stringWithFormat:@"CRUD, %@ auth, table with %@ permissions", providerName, tableTypeName];
    BOOL crudShouldWork = tableType == ZumoTableUnauthenticated || tableType == ZumoTableApplication || (tableType == ZumoTableAuthenticated && isAuthenticated);
    ZumoTest *result = [ZumoTest createTestWithName:testName andExecution:^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        MSClient *client = [[ZumoTestGlobals sharedInstance] client];
        MSTable *table = [client tableWithName:tableName];
        [table insert:@{@"name":@"john"} completion:^(NSDictionary *inserted, NSError *insertError) {
            if (![self validateCRUDResultForTest:test andOperation:@"Insert" andError:insertError andExpected:crudShouldWork]) {
                completion(NO);
                return;
            }
            
            NSDictionary *toUpdate = crudShouldWork ? inserted : @{@"name":@"jane",@"id":[NSNumber numberWithInt:1]};
            [table update:toUpdate completion:^(NSDictionary *updated, NSError *updateError) {
                if (![self validateCRUDResultForTest:test andOperation:@"Update" andError:updateError andExpected:crudShouldWork]) {
                    completion(NO);
                    return;
                }
                
                NSNumber *itemId = crudShouldWork ? [inserted objectForKey:@"id"] : [NSNumber numberWithInt:1];
                [table readWithId:itemId completion:^(NSDictionary *read, NSError *readError) {
                    if (![self validateCRUDResultForTest:test andOperation:@"Read" andError:readError andExpected:crudShouldWork]) {
                        completion(NO);
                        return;
                    }
                    
                    if (!readError && tableType == ZumoTableAuthenticated) {
                        id serverIdentities = [read objectForKey:@"Identities"];
                        NSDictionary *identities;
                        if ([serverIdentities isKindOfClass:[NSString class]]) {
                            NSString *identitiesJson = serverIdentities;
                            NSData *identitiesData = [identitiesJson dataUsingEncoding:NSUTF8StringEncoding];
                            NSError *jsonError;
                            identities = [NSJSONSerialization JSONObjectWithData:identitiesData options:0 error:&jsonError];
                            if (jsonError) {
                                [test addLog:[NSString stringWithFormat:@"Identities value is not a valid JSON object: %@", jsonError]];
                                completion(NO);
                                return;
                            }
                        } else if ([serverIdentities isKindOfClass:[NSDictionary class]]) {
                            // it's already a dictionary
                            identities = serverIdentities;
                        } else {
                            [test addLog:@"Server identities is not a dictionary of values"];
                            completion(NO);
                            return;
                        }
                        [[[ZumoTestGlobals sharedInstance] globalTestParameters] setObject:identities forKey:lastUserIdentityObjectKey];
                    }
                    
                    [table deleteWithId:itemId completion:^(NSNumber *deletedId, NSError *deleteError) {
                        if (![self validateCRUDResultForTest:test andOperation:@"Delete" andError:deleteError andExpected:crudShouldWork]) {
                            completion(NO);
                        } else {
                            [test setTestStatus:TSPassed];
                            [test addLog:@"Validation succeeded for all operations"];
                            completion(YES);
                        }
                    }];
                }];
            }];
        }];
    }];
    return result;
}

+ (BOOL)validateCRUDResultForTest:(ZumoTest *)test andOperation:(NSString *)operation andError:(NSError *)error andExpected:(BOOL)shouldSucceed {
    if (shouldSucceed == (error == nil)) {
        if (error) {
            NSHTTPURLResponse *resp = [[error userInfo] objectForKey:MSErrorResponseKey];
            if (resp.statusCode == 401) {
                [test addLog:[NSString stringWithFormat:@"Got expected response code for operation %@: %ld", operation, (long)resp.statusCode]];
                return YES;
            } else {
                [test addLog:[NSString stringWithFormat:@"Got invalid response code for operation %@: %ld", operation, (long)resp.statusCode]];
                return NO;
            }
        } else {
            return YES;
        }
    } else {
        [test addLog:[NSString stringWithFormat:@"Should%@ succeed for %@, but error = %@", (shouldSucceed ? @"" : @" not"), operation, error]];
        [test setTestStatus:TSFailed];
        return NO;
    }
}

+ (ZumoTest *)createClientSideLoginWithProvider:(NSString *)provider {
    return [ZumoTest createTestWithName:[NSString stringWithFormat:@"Login via token for %@", provider] andExecution:^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        NSDictionary *lastIdentity = [[[ZumoTestGlobals sharedInstance] globalTestParameters] objectForKey:lastUserIdentityObjectKey];
        if (!lastIdentity) {
            [test addLog:@"Last identity is null. Cannot run this test."];
            [test setTestStatus:TSFailed];
            completion(NO);
            return;
        }
        
        [[[ZumoTestGlobals sharedInstance] globalTestParameters] removeObjectForKey:lastUserIdentityObjectKey];
        
        [test addLog:[NSString stringWithFormat:@"Last user identity object: %@", lastIdentity]];
        NSDictionary *providerIdentity = [lastIdentity objectForKey:provider];
        if (!providerIdentity) {
            [test addLog:@"Don't have identity for specified provider. Cannot run this test."];
            [test setTestStatus:TSFailed];
            completion(NO);
            return;
        }

        MSClient *client = [[ZumoTestGlobals sharedInstance] client];
        NSDictionary *token = @{@"access_token": [providerIdentity objectForKey:@"accessToken"]};
        [client loginWithProvider:provider token:token completion:^(MSUser *user, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Error logging in: %@", error]];
                [test setTestStatus:TSFailed];
                completion(NO);
            } else {
                [test addLog:[NSString stringWithFormat:@"Logged in as %@", [user userId]]];
                [test setTestStatus:TSPassed];
                completion(YES);
            }
        }];
        
    }];
}

+ (ZumoTest *)createLoginTestForProvider:(NSString *)provider usingSimplifiedMode:(BOOL)useSimplified {
    ZumoTest *result = [ZumoTest createTestWithName:[NSString stringWithFormat:@"%@Login for %@", useSimplified ? @"Simplified " : @"", provider] andExecution:^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        MSClient *client = [[ZumoTestGlobals sharedInstance] client];
        BOOL shouldDismissControllerInBlock = !useSimplified;
        MSClientLoginBlock loginBlock = ^(MSUser *user, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Error logging in: %@", error]];
                [test setTestStatus:TSFailed];
                completion(NO);
            } else {
                [test addLog:[NSString stringWithFormat:@"Logged in as %@", [user userId]]];
                [test setTestStatus:TSPassed];
                completion(YES);
            }
            
            if (shouldDismissControllerInBlock) {
                [viewController dismissViewControllerAnimated:YES completion:nil];
            }
        };
        
        if (useSimplified) {
            [client loginWithProvider:provider controller:viewController animated:YES completion:loginBlock];
        } else {
            UIViewController *loginController = [client loginViewControllerWithProvider:provider completion:loginBlock];
            [viewController presentViewController:loginController animated:YES completion:nil];
        }
    }];
    
    return result;
}

+ (ZumoTest *)createClearAuthCookiesTest {
    ZumoTest *result = [ZumoTest createTestWithName:@"Clear login cookies" andExecution:^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        NSHTTPCookieStorage *cookieStorage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
        NSPredicate *isAuthCookie = [NSPredicate predicateWithFormat:@"domain ENDSWITH '.facebook.com' or domain ENDSWITH '.google.com' or domain ENDSWITH '.live.com' or domain ENDSWITH '.twitter.com'"];
        NSArray *cookiesToRemove = [[cookieStorage cookies] filteredArrayUsingPredicate:isAuthCookie];
        for (NSHTTPCookie *cookie in cookiesToRemove) {
            NSLog(@"Removed cookie from %@", [cookie domain]);
            [cookieStorage deleteCookie:cookie];
        }

        [test addLog:@"Removed authentication-related cookies from this app."];
        completion(YES);
    }];

    return result;
}

+ (ZumoTest *)createLogoutTest {
    ZumoTest *result = [ZumoTest createTestWithName:@"Logout" andExecution:^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        MSClient *client = [[ZumoTestGlobals sharedInstance] client];
        [client logout];
        [test addLog:@"Logged out"];
        MSUser *loggedInUser = [client currentUser];
        if (loggedInUser == nil) {
            [test setTestStatus:TSPassed];
            completion(YES);
        } else {
            [test addLog:[NSString stringWithFormat:@"Error, user for client is not null: %@", loggedInUser]];
            [test setTestStatus:TSFailed];
            completion(NO);
        }
    }];
    
    return result;
}

+ (NSString *)groupDescription {
    return @"Tests to validate all forms of the login operation in the client SDK.";
}

@end
