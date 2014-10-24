using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MonoTouch.Dialog;
using MonoTouch.Foundation;
using MonoTouch.UIKit;

namespace Microsoft.WindowsAzure.Mobile.iOS.Test
{
    class AccessibleStringElement : StringElement
    {
        public AccessibleStringElement(string caption, string accessibilityId) :
            base(caption)
        {
            this.AccessibilityId = accessibilityId;
        }

        public AccessibleStringElement(string caption, NSAction tapped, string accessibilityId) :
            base(caption, tapped)
        {
            this.AccessibilityId = accessibilityId;
        }

        public AccessibleStringElement(string caption, string value, string accessibilityId) :
            base(caption, value)
        {
            this.AccessibilityId = accessibilityId;
        }

        public string AccessibilityId { get; private set; }

        public override UITableViewCell GetCell(UITableView tv)
        {
            var result = base.GetCell(tv);
            result.SetAccessibilityId(this.AccessibilityId);
            return result;
        }
    }
}