// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

using System.Reflection;
using Microsoft.WindowsAzure.MobileServices.TestFramework;
using Windows.ApplicationModel.Activation;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Microsoft.WindowsAzure.MobileServices.Test
{
    /// <summary>
    /// Provides application-specific behavior to supplement the default
    /// Application class.
    /// </summary>
    public sealed partial class App : Application
    {
        private string testTags = string.Empty;
        public static MobileServiceClient LoginMobileService;

        /// <summary>
        /// Gets the test harness used by the application.
        /// </summary>
        public static TestHarness Harness { get; private set; }

        /// <summary>
        /// Initialize the test harness.
        /// </summary>
        static App()
        {
            Harness = new TestHarness();
            Harness.Platform = TestPlatform.WindowsStore;
            Harness.LoadTestAssembly(typeof(FunctionalTestBase).GetTypeInfo().Assembly);
            Harness.LoadTestAssembly(typeof(LoginTests).GetTypeInfo().Assembly);
        }

        /// <summary>
        /// Initializes a new instance of the App class.
        /// </summary>
        public App()
        {
            InitializeComponent();
        }

        /// <summary>
        /// Setup the application and initialize the tests.
        /// </summary>
        /// <param name="args">
        /// Details about the launch request and process.
        /// </param>
        protected override void OnLaunched(LaunchActivatedEventArgs args)
        {
            // Do not repeat app initialization when already running, just
            // ensure that the window is active
            if (args.PreviousExecutionState == ApplicationExecutionState.Running)
            {
                Window.Current.Activate();
                return;
            }

            // Set the App Mode and configuration based on the arguments
            Harness.SetAutoConfig(args.Arguments);
            Frame rootFrame = new Frame();

            if (Harness.Settings.ManualMode)
            {
                rootFrame.Navigate(typeof(MainPage));
            }
            else
            {
                rootFrame.Navigate(typeof(TestPage));
            }

            Window.Current.Content = rootFrame;
            Window.Current.Activate();
        }
    }
}
