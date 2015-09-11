// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

#import "ZumoPushTests.h"
#import "ZumoTest.h"
#import "ZumoTestGlobals.h"

// Helper class which will receive the push requests, and call a callback either
// after a timer ends or after a push notification is received.
@interface ZumoPushClient : NSObject <PushNotificationReceiver>
{
    NSTimer *timer;
}

@property (nonatomic, readonly, weak) ZumoTest *test;
@property (nonatomic, readonly, strong) ZumoTestCompletion completion;
@property (nonatomic, readonly, strong) NSDictionary *payload;

@end

@implementation ZumoPushClient

@synthesize test = _test, completion = _completion;

- (id)initForTest:(__weak ZumoTest*)test withPayload:(NSDictionary *)payload waitFor:(NSTimeInterval)seconds withTestCompletion:(ZumoTestCompletion)completion {
    self = [super init];
    if (self) {
        _test = test;
        _completion = completion;
        _payload = [payload copy];
        timer = [NSTimer scheduledTimerWithTimeInterval:seconds target:self selector:@selector(timerFired:) userInfo:nil repeats:NO];
        [[ZumoTestGlobals sharedInstance] setPushNotificationDelegate:self];
    }
    
    return self;
}

- (void)timerFired:(NSTimer *)theTimer {
    if (_payload) {
        [_test addLog:@"Push notification not received within the allowed time. Need to retry?"];
        [_test setTestStatus:TSFailed];
        _completion(NO);
    } else {
        [_test addLog:@"Push notification not received for invalid payload - success."];
        [_test setTestStatus:TSPassed];
        _completion(YES);
    }
}

- (void)pushReceived:(NSDictionary *)userInfo {
    [timer invalidate];
    [_test addLog:[NSString stringWithFormat:@"Push notification received: %@", userInfo]];
    if (_payload) {
        NSDictionary *expectedPushInfo = [self zumoPayloadToApsPayload:_payload];
        if ([self compareExpectedPayload:expectedPushInfo withActual:userInfo]) {
            [_test setTestStatus:TSPassed];
            _completion(YES);
        } else {
            [_test addLog:[NSString stringWithFormat:@"Error, payloads are different. Expected: %@, actual: %@", expectedPushInfo, userInfo]];
            [_test setTestStatus:TSFailed];
            _completion(NO);
        }
    } else {
        [_test addLog:@"This is a negative test, the payload should not have been received!"];
        [_test setTestStatus:TSFailed];
        _completion(NO);
    }
}

- (BOOL)compareExpectedPayload:(NSDictionary *)expected withActual:(NSDictionary *)actual {
    BOOL allEqual = YES;
    for (NSString *key in [expected keyEnumerator]) {
        id actualValue = actual[key];
        if (!actualValue) {
            allEqual = NO;
            [_test addLog:[NSString stringWithFormat:@"Key %@ in the expected payload, but not in the push received", key]];
        } else {
            id expectedValue = [expected objectForKey:key];
            if ([actualValue isKindOfClass:[NSDictionary class]] && [expectedValue isKindOfClass:[NSDictionary class]]) {
                // Compare recursively
                if (![self compareExpectedPayload:(NSDictionary *)expectedValue withActual:(NSDictionary *)actualValue]) {
                    [_test addLog:[NSString stringWithFormat:@"Value for key %@ in the expected payload is different than the one on the push received", key]];
                    allEqual = NO;
                }
            } else {
                // Use simple comparison
                if (![expectedValue isEqual:actualValue]) {
                    [_test addLog:[NSString stringWithFormat:@"Value for key %@ in the expected payload (%@) is different than the one on the push received (%@)", key, expectedValue, actualValue]];
                    allEqual = NO;
                }
            }
        }
    }
    
    if (allEqual) {
        for (NSString *key in [actual keyEnumerator]) {
            if (!expected[key]) {
                allEqual = NO;
                [_test addLog:[NSString stringWithFormat:@"Key %@ in the push received, but not in the expected payload", key]];
            }
        }
    }
    
    return allEqual;
}

- (NSDictionary *)zumoPayloadToApsPayload:(NSDictionary *)originalPayload {
    NSMutableDictionary *result = [[NSMutableDictionary alloc] init];
    NSMutableDictionary *aps = [[NSMutableDictionary alloc] init];
    [result setValue:aps forKey:@"aps"];
    id alert = originalPayload[@"alert"];
    if (alert) {
        [aps setValue:alert forKey:@"alert"];
    }
    
    id badge = originalPayload[@"badge"];
    if (badge) {
        [aps setValue:badge forKey:@"badge"];
    }
    
    id sound = originalPayload[@"sound"];
    if (sound) {
        [aps setValue:sound forKey:@"sound"];
    }
    
    NSDictionary *payload = originalPayload[@"payload"];
    if (payload) {
        [result addEntriesFromDictionary:payload];
    }
    
    return result;
}

@end

// Main implementation
@implementation ZumoPushTests

static NSString *tableName = @"iosPushTest";
static NSString *pushClientKey = @"PushClientKey";

+ (NSArray *)createTests {
    NSMutableArray *result = [NSMutableArray new];
    BOOL isSimulator = [self isRunningOnSimulator];
    
    if (isSimulator) {
        ZumoTestGlobals *globals = [ZumoTestGlobals sharedInstance];
        globals.deviceToken = [ZumoPushTests bytesFromHexString:@"59D31B14081B92DAA98FAD91EDC0E61FC23767D5B90892C4F22DF56E312045C8"];
    } else {
        [result addObject:[self createValidatePushRegistrationTest]];
    }
    
    [result addObject:[self createRegisterUnregisterTest]];
    [result addObject:[self createTemplateRegisterUnregisterTest]];
    [result addObject:[self createOverrideRegistrationTest]];
    [result addObject:[self createRegisterLoginTest]];
    
    if (!isSimulator) {
        [result addObject:[self createPushTestWithName:@"Push simple alert" forPayload:@{@"alert":@"push received"} withDelay:0]];
        [result addObject:[self createPushTestWithName:@"Push simple badge" forPayload:@{@"badge":@9} withDelay:0]];
        [result addObject:[self createPushTestWithName:@"Push simple sound and alert" forPayload:@{@"alert":@"push received",@"sound":@"default"} withDelay:0]];
        [result addObject:[self createPushTestWithName:@"Push alert with loc info and parameters" forPayload:@{@"alert":@{@"loc-key":@"LOC_STRING",@"loc-args":@[@"first",@"second"]}} withDelay:0]];
        [result addObject:[self createPushTestWithName:@"Push with only custom info (no alert / badge / sound)" forPayload:@{@"aps":@{},@"foo":@"bar"} withDelay:0]];
        [result addObject:[self createPushTestWithName:@"Push with alert, badge and sound" forPayload:@{@"aps":@{@"alert":@"simple alert", @"badge":@7, @"sound":@"default"},@"custom":@"value"} withDelay:0]];
        [result addObject:[self createPushTestWithName:@"Push with alert with non-ASCII characters" forPayload:@{@"alert":@"Latin-ãéìôü ÇñÑ, arabic-لكتاب على الطاولة, chinese-这本书在桌子上"} withDelay:0]];
        
        [result addObject:[self createPushTestWithName:@"(Neg) Push with large payload" forPayload:@{@"alert":[@"" stringByPaddingToLength:256 withString:@"*" startingAtIndex:0]} withDelay:0 isNegativeTest:YES]];
    }
    
    return result;
}

+ (BOOL)isRunningOnSimulator {
    NSString *deviceModel = [UIDevice currentDevice].model;
    return [deviceModel rangeOfString:@"Simulator" options:NSCaseInsensitiveSearch].location != NSNotFound;
}

+ (ZumoTest *)createValidatePushRegistrationTest {
    ZumoTest *result = [ZumoTest createTestWithName:@"Validate push registration" andExecution:^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        
        ZumoTestGlobals *globals = [ZumoTestGlobals sharedInstance];
        [test addLog:[globals remoteNotificationRegistrationStatus]];
        if ([globals deviceToken]) {
            [test addLog:[NSString stringWithFormat:@"Device token: %@", [globals deviceToken]]];
            [test setTestStatus:TSPassed];
            completion(YES);
        } else {
            [test setTestStatus:TSFailed];
            completion(NO);
        }
    }];
    
    return result;
}

+ (ZumoTest *)createPushTestWithName:(NSString *)name forPayload:(NSDictionary *)payload withDelay:(int)seconds {
    return [self createPushTestWithName:name forPayload:payload withDelay:seconds isNegativeTest:NO];
}

+ (void)sendNotificationViaInsert:(MSClient *)client test:(ZumoTest *)test seconds:(int)seconds deviceToken:(NSString *)deviceToken payload:(NSDictionary *)payload completion:(ZumoTestCompletion)completion isNegative:(BOOL)isNegative {
    MSTable *table = [client tableWithName:tableName];
    
    [test addLog:[NSString stringWithFormat:@"Sending a request to %@ / table %@", client.applicationURL.description, tableName]];
    
    NSDictionary *item = @{@"method" : @"send", @"payload" : payload, @"token": deviceToken, @"delay": @(seconds)};
    [table insert:item completion:^(NSDictionary *insertedItem, NSError *error) {
        if (error) {
            [test addLog:[NSString stringWithFormat:@"Error requesting push: %@", error]];
            [test setTestStatus:TSFailed];
            completion(NO);
        } else {
            NSTimeInterval timeToWait = 15;
            NSDictionary *expectedPayload = isNegative ? nil : payload;
            ZumoPushClient *pushClient = [[ZumoPushClient alloc] initForTest:test withPayload:expectedPayload waitFor:timeToWait withTestCompletion:completion];
            [[test propertyBag] setValue:pushClient forKey:pushClientKey];
            
            // completion will be called on the push client
        }
    }];
}

+ (ZumoTest *)createRegisterUnregisterTest
{
    ZumoTestExecution testExecution = ^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        MSClient *client = [[ZumoTestGlobals sharedInstance] client];
        NSData *deviceToken = [[ZumoTestGlobals sharedInstance] deviceToken];
        __block TestStatus overallTestStatus = TSPassed;
        
        // Confirm the registration has been removed from the server
        MSAPIBlock verifyUnregister = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Verification error: %@", error.localizedDescription]];
                overallTestStatus = TSFailed;
            }
            completion(overallTestStatus == TSPassed);
        };
        
        // Now attemp to unregister the installation
        MSCompletionBlock unregisterInstallation = ^(NSError *error) {
            // Verify unregister succeeded
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Error unregistering: %@", error.localizedDescription]];
                test.testStatus = TSFailed;
                completion(NO);
                return;
            }
            
            [client invokeAPI:@"verifyUnregisterInstallationResult"
                         body:nil
                   HTTPMethod:@"GET"
                   parameters:nil
                      headers:nil
                   completion:verifyUnregister];
        };
        
        // Verify that the registration did have the expected format
        MSAPIBlock checkVerifyReg = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Verification error: %@", error.localizedDescription]];
                overallTestStatus = TSFailed;
            }
            
            [client.push unregisterWithCompletion:unregisterInstallation];
        };
        
        MSCompletionBlock verifyRegister = ^(NSError *error) {
            // Verify register call succeeded
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Error registering: %@", error.description]];
                test.testStatus = TSFailed;
                completion(NO);
                return;
            }
            
            [client invokeAPI:@"verifyRegisterInstallationResult"
                         body:nil
                   HTTPMethod:@"GET"
                   parameters:@{ @"channelUri" : [ZumoPushTests convertDeviceToken:deviceToken] }
                      headers:nil
                   completion:checkVerifyReg];
        };
        
        MSAPIBlock registerToken = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Cleanup failed: %@", error.localizedDescription]];
                test.testStatus = TSFailed;
                completion(NO);
                return;
            }
            
            // Create a new registration on the server
            [client.push registerDeviceToken:deviceToken completion:verifyRegister];
        };
        
        [client invokeAPI:@"DeleteRegistrationsForChannel" body:nil HTTPMethod:@"DELETE"
               parameters:@{ @"channelUri": [ZumoPushTests convertDeviceToken:deviceToken] }
                  headers:nil completion:registerToken];
    };
    
    return[ZumoTest createTestWithName:@"RegisterUnregister" andExecution:testExecution];
}

+ (ZumoTest *)createRegisterLoginTest
{
    ZumoTestExecution testExecution = ^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        MSClient *client = [[ZumoTestGlobals sharedInstance] client];
        NSData *deviceToken = [[ZumoTestGlobals sharedInstance] deviceToken];
        
        MSCompletionBlock unregisterInstallation = ^(NSError *error) {
            // Verify unregister succeeded
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Unregister Error: %@", error.localizedDescription]];
                test.testStatus = TSFailed;
                completion(NO);
                return;
            }
            
            [client logout];
            
            completion(test.testStatus != TSFailed);
        };
        
        MSAPIBlock checkVerifyReg = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Verify Error: %@", error.localizedDescription]];
                test.testStatus = TSFailed;
            }
            
            [client.push unregisterWithCompletion:unregisterInstallation];
        };
        
        MSCompletionBlock verifyRegister = ^(NSError *error) {
            // Verify register call succeeded
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Register Error: %@", error.description]];
                test.testStatus = TSFailed;
                completion(NO);
                return;
            }
            
            [client invokeAPI:@"verifyRegisterInstallationResult"
                         body:nil
                   HTTPMethod:@"GET"
                   parameters:@{ @"channelUri" : [ZumoPushTests convertDeviceToken:deviceToken] }
                      headers:nil
                   completion:checkVerifyReg];
        };
        
        MSAPIBlock loggedInRegister = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            // Verify register call succeeded
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Error getting login: %@", error.description]];
                test.testStatus = TSFailed;
                completion(NO);
                return;
            }
        
            NSDictionary *token = result[@"token"];
            NSString *uid = token[@"payload"][@"uid"];
            
            client.currentUser = [[MSUser alloc] initWithUserId:uid];
            client.currentUser.mobileServiceAuthenticationToken = token[@"rawData"];
            
            [client.push registerDeviceToken:deviceToken completion:verifyRegister];
        };
        
        MSAPIBlock getLoginInfo = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            // Verify register call succeeded
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Error registering: %@", error.description]];
                test.testStatus = TSFailed;
                completion(NO);
                return;
            }
            
            // Clean up any existing registrations for this token
            [client invokeAPI:@"JwtTokenGenerator"
                         body:nil
                   HTTPMethod:@"GET"
                   parameters:nil
                      headers:nil
                   completion:loggedInRegister];
        };
        
        // Clean up any existing registrations for this token
        [client invokeAPI:@"DeleteRegistrationsForChannel"
                     body:nil
               HTTPMethod:@"DELETE"
               parameters:@{ @"channelUri": [ZumoPushTests convertDeviceToken:deviceToken] }
                  headers:nil
               completion:getLoginInfo];
    };
    
    return[ZumoTest createTestWithName:@"RegisterLogin" andExecution:testExecution];
}

+ (ZumoTest *)createTemplateRegisterUnregisterTest
{
    ZumoTestExecution testExecution = ^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        MSClient *client = [[ZumoTestGlobals sharedInstance] client];
        NSData *deviceToken = [[ZumoTestGlobals sharedInstance] deviceToken];

        MSAPIBlock checkVerifyUnregister = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Verification error: %@", error.localizedDescription]];
                completion(NO);
                return;
            }
            completion(test.testStatus != TSFailed);
        };
        
        MSCompletionBlock verifyUnregister = ^(NSError *error) {
            // Verify unregister succeeded
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Error unregistering: %@", error.description]];
                test.testStatus = TSFailed;
                
                completion(NO);
                return;
            }
            
            [client invokeAPI:@"verifyUnregisterInstallationResult"
                         body:nil
                   HTTPMethod:@"GET"
                   parameters:nil
                      headers:nil
                   completion:checkVerifyUnregister];
        };

        MSAPIBlock verifyRegister = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Verification error: %@", error.localizedDescription]];
                test.testStatus = TSFailed;
            }
            
            [client.push unregisterWithCompletion:verifyUnregister];
        };
        
        [client.push registerDeviceToken:deviceToken
                                template:@{ @"templateName": @{ @"body": @{ @"aps": @{ @"alert": @"boo!" }, @"extraprop" : @"($message)" }, @"tags": @[@"one", @"two"] } }
                              completion:^(NSError *error) {
            // Verify register call succeeded
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Encountered error registering with Mobile Service: %@", error.description]];
                [test setTestStatus:TSFailed];
                completion(NO);
                return;
            }

            NSString *expectedTemplate = @"{\"templateName\":{\"body\":\"{\\\"aps\\\":{\\\"alert\\\":\\\"boo!\\\"},\\\"extraprop\\\":\\\"($message)\\\"}\"}}";
            [client invokeAPI:@"verifyRegisterInstallationResult"
                       body:nil
                 HTTPMethod:@"GET"
                 parameters:@{ @"channelUri" : [ZumoPushTests convertDeviceToken:deviceToken],
                               @"templates" : expectedTemplate }
                    headers:nil
                 completion:verifyRegister];
        }];
    };
    
    return [ZumoTest createTestWithName:@"RegisterUnregisterTemplate" andExecution:testExecution];
}

+ (ZumoTest *)createOverrideRegistrationTest {
    ZumoTestExecution testExecution = ^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        MSClient *client = [[ZumoTestGlobals sharedInstance] client];
        NSData *deviceToken = [[ZumoTestGlobals sharedInstance] deviceToken];
        
        MSAPIBlock checkVerify = ^(id result, NSHTTPURLResponse *response, NSError *error) {
            if (error) {
                [test addLog:[NSString stringWithFormat:@"Verify error: %@", error.localizedDescription]];
                test.testStatus = TSFailed;
            }
            
            [client.push unregisterWithCompletion:^(NSError *error) {
                completion(test.testStatus != TSFailed);
            }];
        };
        
        MSCompletionBlock verifyPushTwo = ^(NSError *error) {
            NSString *expectedTemplate = @"{\"t7\":{\"body\":\"{\\\"aps\\\":{\\\"alert\\\":\\\"lookout!\\\"}}\"}}";
            [client invokeAPI:@"verifyRegisterInstallationResult"
                         body:nil
                   HTTPMethod:@"GET"
                   parameters:@{ @"channelUri" : [ZumoPushTests convertDeviceToken:deviceToken],
                                 @"templates" : expectedTemplate }
                      headers:nil
                   completion:checkVerify];
        };
        
        MSCompletionBlock pushTwo = ^(NSError *error) {
            [client.push registerDeviceToken:deviceToken
                                    template:@{ @"t7": @{ @"body": @{ @"aps": @{ @"alert": @"lookout!" } } } }
                                  completion:verifyPushTwo];
        };
        
        [client.push registerDeviceToken:deviceToken
                                template:@{ @"t1": @{ @"body": @{ @"aps": @{ @"alert": @"boo!" }, @"extraprop" : @"($message)" } } }
                              completion:pushTwo];
        
        
    };
    
    return [ZumoTest createTestWithName:@"overrideRegistrationTest" andExecution:testExecution];
}

+ (ZumoTest *)createPushTestWithName:(NSString *)name forPayload:(NSDictionary *)payload withDelay:(int)seconds isNegativeTest:(BOOL)isNegative {
    ZumoTest *result = [ZumoTest createTestWithName:name
                                       andExecution:^(ZumoTest *test, UIViewController *viewController, ZumoTestCompletion completion) {
        if ([self isRunningOnSimulator]) {
            [test addLog:@"Test running on a simulator, skipping test."];
            [test setTestStatus:TSSkipped];
            completion(YES);
            return;
        }
        
        NSData *deviceToken = [[ZumoTestGlobals sharedInstance] deviceToken];
        
        if (!deviceToken) {
            [test addLog:@"Device not correctly registered for push"];
            [test setTestStatus:TSFailed];
            completion(NO);
        } else {
            MSClient *client = [[ZumoTestGlobals sharedInstance] client];
            [client.push registerDeviceToken:deviceToken completion:^(NSError *error) {
                if (error) {
                    [test addLog:[NSString stringWithFormat:@"Encountered error registering with Mobile Service: %@", error.description]];
                    [test setTestStatus:TSFailed];
                    completion(NO);
                    return;
                }
                
                [self sendNotificationViaInsert:client
                                           test:test
                                        seconds:seconds
                                    deviceToken:client.push.installationId
                                        payload:payload
                                     completion:completion
                                     isNegative:isNegative];
            }];
        }
    }];
    
    return result;
}

+ (NSString *)groupDescription {
    return @"Tests to validate that the server-side push module can correctly deliver messages to the iOS client.";
}


+ (NSData *)bytesFromHexString:(NSString *)hexString;
{
    NSMutableData* data = [NSMutableData data];
    for (int idx = 0; idx+2 <= hexString.length; idx+=2) {
        NSRange range = NSMakeRange(idx, 2);
        NSString* hexStr = [hexString substringWithRange:range];
        NSScanner* scanner = [NSScanner scannerWithString:hexStr];
        unsigned int intValue;
        if ([scanner scanHexInt:&intValue])
            [data appendBytes:&intValue length:1];
    }
    return data;
}

+ (NSString *)convertDeviceToken:(NSData *)deviceTokenData
{
    NSCharacterSet *hexFormattingCharacters = [NSCharacterSet characterSetWithCharactersInString:@"<>"];
    NSString* newDeviceToken = [[[[deviceTokenData description]
                                  stringByTrimmingCharactersInSet:hexFormattingCharacters]
                                 stringByReplacingOccurrencesOfString:@" " withString:@""]
                                uppercaseString];
    return newDeviceToken;
}

@end