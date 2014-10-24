// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

#import "ZumoTestGroupTableViewController.h"
#import "ZumoTestHelpViewController.h"
#import "ZumoTestGlobals.h"
#import "ZumoTestStore.h"
#import "ZumoDaylightConnection.h"
#import <MessageUI/MFMailComposeViewController.h>
#import "ZumoTestResultViewController.h"
#import "ZumoTestCallbacks.h"

@interface ZumoTestGroupTableViewController () <MFMailComposeViewControllerDelegate>

@property (nonatomic, strong) ZumoDaylightConnection *daylightConnection;
@property (nonatomic, strong) NSString *runName;
@property (nonatomic, strong) NSString *runId;
@property (nonatomic, strong) NSIndexPath *selectedRow;
@end

@implementation ZumoTestGroupTableViewController

@synthesize testGroup, logUploadUrl;

- (id)initWithStyle:(UITableViewStyle)style
{
    return [self init];
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    NSString *groupName = [self.testGroup name];
    
    ZumoTestGlobals *globals = [ZumoTestGlobals sharedInstance];
    if (globals.daylightProject) {
        self.runName = @"E2E: iOS: iPadSim";
        _daylightConnection = [[ZumoDaylightConnection alloc] initWithName:self.runName
                                                                forProject:globals.daylightProject
                                                                      withId:globals.daylightClientId
                                                                   andSecret:globals.daylightClientSecret];
    }
    
    [[self navigationItem] setTitle:groupName];
    
    [self resetTests:self];
    
    if ([groupName hasPrefix:ALL_TESTS_GROUP_NAME]) {
        // Start running the tests
        [self runTests:nil];
    }
}

-(void) viewWillAppear:(BOOL)animated
{
    [self.navigationController setToolbarHidden:NO animated:YES];
}

- (void) viewWillDisappear:(BOOL)animated
{
    [self.navigationController setToolbarHidden:YES animated:animated];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    
    // Dispose of any resources that can be recreated.
}

-(void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    if ([segue.identifier isEqualToString:@"details"]) {
        ZumoTestResultViewController *vc = (ZumoTestResultViewController *) segue.destinationViewController;
        vc.test = self.testGroup.tests[self.selectedRow.row];
    }
}

#pragma mark - Table view data source

-(void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
    
    self.selectedRow = indexPath;
    [self performSegueWithIdentifier:@"details" sender:self];
}

- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView
{
    return 1;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
    return self.testGroup.tests.count;
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
    static NSString *CellIdentifier = @"test";
    
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:CellIdentifier];
    if (!cell) {
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleDefault reuseIdentifier:CellIdentifier];
    }
    
    ZumoTest *test = [[[self testGroup] tests] objectAtIndex:[indexPath row]];
    UIColor *textColor;
    if ([test testStatus] == TSFailed) {
        textColor = [UIColor redColor];
    } else if ([test testStatus] == TSPassed) {
        textColor = [UIColor greenColor];
    } else if ([test testStatus] == TSRunning) {
        textColor = [UIColor grayColor];
    } else if ([test testStatus] == TSSkipped) {
        textColor = [UIColor magentaColor];
    } else {
        textColor = [UIColor blackColor];
    }
    
    cell.textLabel.textColor = textColor;
    cell.textLabel.text = test.description;
    cell.textLabel.minimumScaleFactor = 0.5;
    return cell;
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField {
    [textField resignFirstResponder];
    return YES;
}

- (IBAction)runTests:(id)sender {
    NSLog(@"Start running tests!");
    
    self.testGroup.delegate = self;

    void (^runTestBlock)(NSString *stringId);
    runTestBlock = ^(NSString *runId) {
        __weak UIViewController *weakSelf = self;
        self.runId = runId;
        [self.testGroup startExecutingFrom:weakSelf];        
    };
    
    if (!self.daylightConnection) {
        runTestBlock(@"Local");
    } else {
        [self.daylightConnection createRunWithCount:self.testGroup.tests.count completion:^(NSString *runId) {
            dispatch_async(dispatch_get_main_queue(), ^{
                runTestBlock(runId);
            });
        }];
    }
}

- (IBAction)resetTests:(id)sender {
    ZumoTest *test;
    for (test in [[self testGroup] tests]) {
        [test resetStatus];
    }
    [self.tableView reloadData];
}

- (void)zumoTestGroupFinished:(NSString *)groupName withPassed:(int)passedTests andFailed:(int)failedTests andSkipped:(int)skippedTests {
    
    NSMutableArray *testResults = [NSMutableArray new];
    for (ZumoTest *test in self.testGroup.tests) {
        NSArray *log = test.formattedLog;
        if (log) {
            test.logFileName = self.daylightConnection ? [self.daylightConnection uploadLog:log completion:nil] : @"";
            
            NSString *groupName = test.groupName ? test.groupName : self.testGroup.name;
            [testResults addObject:@{ @"adapter":@"zumotestsconverter",
                                      @"full_name":test.name,
                                      @"source":[groupName stringByReplacingOccurrencesOfString:@" " withString:@""],
                                      @"run_id":self.runId,
                                      @"outcome":[ZumoTest testStatusToString:test.testStatus],
                                      @"start_time":[NSString stringWithFormat:@"%lld", [ZumoDaylightConnection fileTime:test.startTime]],
                                      @"end_time":[NSString stringWithFormat:@"%lld", [ZumoDaylightConnection fileTime:test.endTime]],
                                      //@"tags":@[],
                                      @"attachments": @{ @"logs.txt" : test.logFileName }
                                      }];
        }
    }
    
    if (self.daylightConnection) {
        [self.daylightConnection reportTestResult:testResults completion:^(NSError *error) {
            ZumoTestGlobals *globals = [ZumoTestGlobals sharedInstance];
            NSString *masterRunId = globals.daylightMasterRunId;
            if (masterRunId) {
                NSArray *finalLog = @[[NSString stringWithFormat:@"Total Tests: %d", self.testGroup.testsPassed + self.testGroup.testsFailed],
                                      [NSString stringWithFormat:@"Passed Tests: %d", self.testGroup.testsPassed],
                                      [NSString stringWithFormat:@"Failed Tests: %d", self.testGroup.testsFailed],
                                      [NSString stringWithFormat:@"Test Details: https://www.daylightapp.net/zumo2/runs/%@", self.runId],
                                      [NSString stringWithFormat:@"Server: %@", globals.globalTestParameters[RUNTIME_VERSION_TAG]]];
                
                NSString *finalLogFile = self.daylightConnection ? [self.daylightConnection uploadLog:finalLog completion:nil] : @"";
                
                TestStatus finalTestStatus = self.testGroup.testsFailed > 0 ? TSFailed : TSPassed;
                NSArray *finalResult = @[@{
                                         @"adapter":@"zumotestsconverter",
                                         @"full_name":self.runName,
                                         @"source":@"iOS",
                                         @"run_id":masterRunId,
                                         @"outcome":[ZumoTest testStatusToString:finalTestStatus],
                                         @"start_time":[NSString stringWithFormat:@"%lld", [ZumoDaylightConnection fileTime:self.testGroup.startTime]],
                                         @"end_time":[NSString stringWithFormat:@"%lld", [ZumoDaylightConnection fileTime:self.testGroup.endTime]],
                                         @"tags":@[self.runId, @"iOS", globals.globalTestParameters[RUNTIME_VERSION_TAG]],
                                         @"attachments": @{ @"logs.txt" : finalLogFile }
                                        }];
                
                
                [self.daylightConnection reportTestResult:finalResult completion:^(NSError *error) {
                    dispatch_async(dispatch_get_main_queue(), ^{
                        UIAlertView *av = [[UIAlertView alloc] initWithTitle:@"Tests Complete" message:@"reported" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil];
                        [av show];
                    });
                }];
            } else {
                dispatch_async(dispatch_get_main_queue(), ^{
                    UIAlertView *av = [[UIAlertView alloc] initWithTitle:@"Tests Complete" message:@"no master run" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil];
                    [av show];
                });
            }
        }];
    } else {
        UIAlertView *av = [[UIAlertView alloc] initWithTitle:@"Tests Complete" message:@"happy" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil];
        [av show];
    }
}

- (void)zumoTestGroupSingleTestFinished:(int)testIndex withResult:(TestStatus)testStatus {
    [self.testGroup.tests[testIndex] setTestStatus:testStatus];
    [self.tableView reloadData];
}

- (void)zumoTestGroupSingleTestStarted:(int)testIndex {
    [self.testGroup.tests[testIndex] setTestStatus:TSRunning];
    [self.tableView reloadRowsAtIndexPaths:[NSArray arrayWithObject:[NSIndexPath indexPathForRow:testIndex inSection:0]] withRowAnimation:UITableViewRowAnimationAutomatic];
}

- (void)zumoTestGroupStarted:(NSString *)groupName {
    NSLog(@"Test group started: %@", groupName);
}

- (IBAction)mailResults:(id)sender {
    if (![MFMailComposeViewController canSendMail]) {
        return;
    }
    
    MFMailComposeViewController* controller = [[MFMailComposeViewController alloc] init];
    
    controller.mailComposeDelegate = self;
    
    [controller setSubject:@"Test Results"];
    
    NSMutableArray *allLogs = [NSMutableArray array];
    for (ZumoTest *test in self.testGroup.tests) {
        [allLogs addObjectsFromArray:test.formattedLog];
    }
    
    NSString *message = [allLogs componentsJoinedByString:@"\n"];
    
    [controller setMessageBody:message isHTML:NO];
    
    if (controller) {
        [self presentViewController:controller animated:YES completion:nil];
    }
}

- (void)mailComposeController:(MFMailComposeViewController*)controller
          didFinishWithResult:(MFMailComposeResult)result
                        error:(NSError*)error;
{
    if (result == MFMailComposeResultSent) {
        NSLog(@"Logs sent");
    }
    
    [self dismissViewControllerAnimated:YES completion:nil];
}

@end
