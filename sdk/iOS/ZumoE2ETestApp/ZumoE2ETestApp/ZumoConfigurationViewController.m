// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

#import "ZumoConfigurationViewController.h"
#import "ZumoMainTableViewController.h"
#import "ZumoTestStore.h"
#import "ZumoTestGlobals.h"

@interface ZumoConfigurationViewController () <UITextFieldDelegate>

@property (weak, nonatomic) IBOutlet UITextField *appUrl;
@property (weak, nonatomic) IBOutlet UITextField *clientId;
@property (weak, nonatomic) IBOutlet UITextField *clientSecret;
@property (weak, nonatomic) IBOutlet UITextField *runId;
@property (weak, nonatomic) IBOutlet UISwitch *reportOn;

@property (weak, nonatomic) UITextField *activeField;
@property (weak, nonatomic) IBOutlet UIView *validationView;

@end


@implementation ZumoConfigurationViewController

- (IBAction)BeginTests:(UIButton *)sender {
    // Load app info before continuing...
    if (![self validateAppInfo]) {
        return;
    }
    
    // Automatically add azure-mobile.net if not specified for convenience
    NSString *appUrl = self.appUrl.text;
    if (![appUrl hasPrefix:@"https://"] && ![appUrl hasPrefix:@"http://"]) {
        appUrl = [NSString stringWithFormat:@"https://%@.azure-mobile.net", appUrl];
    }
    
    // Build the client object
    ZumoTestGlobals *globals = [ZumoTestGlobals sharedInstance];
    [globals initializeClientWithAppUrl:appUrl andGatewayURL:nil];
    [globals saveAppInfo:appUrl key:nil];
    
    NSMutableDictionary *globalTestParams = globals.globalTestParameters;
    globalTestParams[RUNTIME_VERSION_TAG] = @"DotNet-App";

    [self performSegueWithIdentifier:@"BeginTests" sender:self];
}

- (void)viewWillAppear:(BOOL)animated
{
    self.navigationController.navigationBar.hidden = YES;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    // Do any additional setup after loading the view.
    
    self.navigationController.navigationBar.hidden = YES;
    
    self.appUrl.delegate = self;
    self.clientId.delegate = self;
    self.clientSecret.delegate = self;
    self.runId.delegate = self;

    NSArray *lastUsedApp = [[ZumoTestGlobals sharedInstance] loadAppInfo];
    if (lastUsedApp) {
        self.appUrl.text = [lastUsedApp objectAtIndex:0];
    }

    [self registerForKeyboardNotifications];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}


#pragma mark - Navigation


// In a storyboard-based application, you will often want to do a little preparation before navigation
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    if ([segue.identifier isEqualToString:@"BeginTests"]) {
        ZumoMainTableViewController *mainController = (ZumoMainTableViewController *)segue.destinationViewController;
        
        mainController.testGroups = [ZumoTestStore createTests];
        
        NSString *appUrl = self.appUrl.text;
        if (![appUrl hasPrefix:@"https://"] && ![appUrl hasPrefix:@"http://"]) {
            appUrl = [NSString stringWithFormat:@"https://%@.azure-mobile.net", appUrl];
        }
        
        ZumoTestGlobals *globals = [ZumoTestGlobals sharedInstance];
        [globals initializeClientWithAppUrl:appUrl andGatewayURL:nil];
        [globals saveAppInfo:appUrl key:nil];

        if (self.reportOn.on) {
            globals.daylightProject = @"zumo2";
            globals.daylightClientId = self.clientId.text;
            globals.daylightClientSecret = self.clientSecret.text;
            globals.daylightMasterRunId = self.runId.text;
        }
        
        self.validationView.hidden = YES;
    }
}

- (BOOL) validateAppInfo {
    
    if ([self.appUrl.text length] == 0) {
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Error" message:@"Please set the application URL and key before proceeding" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil];
        [alert show];
        return NO;
    }
    
    return YES;
 }


# pragma mark UITextFieldDelegate

- (void)registerForKeyboardNotifications
{
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(keyboardWasShown:)
                                                 name:UIKeyboardWillShowNotification object:nil];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(keyboardWillBeHidden:)
                                                 name:UIKeyboardWillHideNotification object:nil];
    
}

// Called when the UIKeyboardDidShowNotification is sent.
- (void)keyboardWasShown:(NSNotification*)aNotification
{
    NSDictionary* info = [aNotification userInfo];
    CGSize kbSize = [[info objectForKey:UIKeyboardFrameBeginUserInfoKey] CGRectValue].size;

    if (self.activeField == self.appUrl) {
        return;
    }
    
    CGRect aRect = self.scrollView.frame;
    aRect.size.height -= kbSize.height;
    
    CGPoint textSpot = self.runId.frame.origin;
    textSpot.y = self.runId.frame.size.height;
    
    if (!CGRectContainsPoint(aRect, textSpot) ) {
        NSTimeInterval duration = [info[UIKeyboardAnimationDurationUserInfoKey] doubleValue];
        [UIView animateWithDuration:duration animations:^{
            [self.view setFrame:CGRectMake(0, -100, self.view.frame.size.width, self.view.frame.size.height)];
        }];
    }
}

// Called when the UIKeyboardWillHideNotification is sent
- (void)keyboardWillBeHidden:(NSNotification*)aNotification
{
    if(self.view.frame.origin.y == 0) {
        return;
    }
    
    NSDictionary* info = [aNotification userInfo];
    NSTimeInterval duration = [info[UIKeyboardAnimationDurationUserInfoKey] doubleValue];

    [UIView animateWithDuration:duration animations:^{
        [self.view setFrame:CGRectMake(0, 0, self.view.frame.size.width, self.view.frame.size.height)];
    }];
}

- (void)textFieldDidBeginEditing:(UITextField *)textField
{
    // todo: adjust view on switch from app fields to reporting ones
    self.activeField = textField;
}

- (void)textFieldDidEndEditing:(UITextField *)textField
{
    self.activeField = nil;
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField {
    [textField resignFirstResponder];
    return YES;
}

@end
