// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

#import <Foundation/Foundation.h>

@interface ZumoDaylightConnection : NSObject

-(id) initWithName:(NSString *)name forProject:(NSString *)project withId:(NSString *)clientId andSecret:(NSString *)clientSecret;

-(void) createRunWithCount:(NSInteger)count completion:(void(^)(NSString *runId))completion;

-(void) reportTestResult:(NSArray *)testResult completion:(void(^)(NSError *error))completion;

-(NSString *) uploadLog:(NSArray *)log completion:(void(^)(NSError *error))completion;

+(unsigned long long) fileTime:(NSDate *)time;

@end
