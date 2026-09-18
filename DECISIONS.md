# Climate Decision Points

## DP1: The Nudge When the Weekly Target Is Crossed

verdio shows a clear but non-judgmental warning: **You’ve crossed your weekly target.** It reports the exact excess amount, keeps logging available, and offers optional practical suggestions such as taking a bus or bike for a short trip, choosing a vegetarian meal, or switching off unused cooling. The choice treats the target as feedback for the next decision rather than a pass/fail score, because shame and blocking would reduce honest tracking and learning.

## DP2: Absurd Input

verdio uses activity-specific thresholds and separates warnings from invalid input. A malformed, empty, negative, or above-maximum value is rejected with a clear error; an unusually high but technically possible value, such as 500,000 km of car travel, is held for review and requires a second confirmation before saving. This protects totals from accidental entries without preventing a user from recording an intentional exceptional journey, and the same validation is applied when editing an existing activity and when sanitizing stored records.

## DP3: The Week

A verdio week runs from Monday 00:00 through Sunday 23:59 in the user’s local timezone. The dashboard clearly shows the date range, current emissions, target, remaining allowance, and percentage used; the progress bar caps at 100% while the actual excess is displayed separately. Mid-week progress uses the elapsed local days for the daily average, and users can select previous weeks so historical activity is viewed separately instead of being mixed into the current week.
