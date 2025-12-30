# Generated manually - Remove legacy Subscription model and update ChangeLog

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('networth_app', '0001_initial'),
    ]

    operations = [
        # Remove the related_subscription FK from ChangeLog first
        migrations.RemoveField(
            model_name='changelog',
            name='related_subscription',
        ),
        
        # Update ChangeLog change_type choices to remove subscription types
        migrations.AlterField(
            model_name='changelog',
            name='change_type',
            field=models.CharField(
                choices=[
                    ('account_added', 'New Account Added'),
                    ('account_removed', 'Account Removed'),
                    ('value_increase', 'Value Increased'),
                    ('value_decrease', 'Value Decreased'),
                    ('milestone_achieved', 'Milestone Achieved'),
                    ('debt_paid_off', 'Debt Paid Off'),
                    ('net_worth_increase', 'Net Worth Increased'),
                    ('net_worth_decrease', 'Net Worth Decreased'),
                ],
                db_index=True,
                max_length=30
            ),
        ),
        
        # Now drop the Subscription table and all its indexes
        migrations.DeleteModel(
            name='Subscription',
        ),
    ]

