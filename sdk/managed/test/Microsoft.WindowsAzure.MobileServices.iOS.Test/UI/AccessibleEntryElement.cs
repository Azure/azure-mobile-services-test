using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MonoTouch.Dialog;
using MonoTouch.Foundation;
using MonoTouch.UIKit;

namespace Microsoft.WindowsAzure.Mobile.iOS.Test
{
    class AccessibleEntryElement : EntryElement
    {
        public AccessibleEntryElement(string caption, string placeholder, string value, string accessibilityId) :
            base(caption, placeholder, value)
        {
            this.AccessibilityId = accessibilityId;
        }

        public AccessibleEntryElement(string caption, string placeholder, string value, bool isPassword, string accessibilityId) :
            base(caption, placeholder, value, isPassword)
        {
            this.AccessibilityId = accessibilityId;
        }

        public string AccessibilityId { get; private set; }

        protected override UITextField CreateTextField(System.Drawing.RectangleF frame)
        {
            var result = base.CreateTextField(frame);
            result.SetAccessibilityId(this.AccessibilityId);
            return result;
        }
    }
}