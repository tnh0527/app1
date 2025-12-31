# Generated manually to rename tables from networth_app to financials_app

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('financials_app', '0002_remove_legacy_subscription'),
    ]

    operations = [
        # Rename all tables from networth_app to financials_app
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    -- Rename main tables
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'networth_app_financialaccount') THEN
                        ALTER TABLE networth_app_financialaccount RENAME TO financials_app_financialaccount;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'networth_app_accountsnapshot') THEN
                        ALTER TABLE networth_app_accountsnapshot RENAME TO financials_app_accountsnapshot;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'networth_app_cashflowentry') THEN
                        ALTER TABLE networth_app_cashflowentry RENAME TO financials_app_cashflowentry;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'networth_app_accountgroup') THEN
                        ALTER TABLE networth_app_accountgroup RENAME TO financials_app_accountgroup;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'networth_app_accountgroup_accounts') THEN
                        ALTER TABLE networth_app_accountgroup_accounts RENAME TO financials_app_accountgroup_accounts;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'networth_app_networthmilestone') THEN
                        ALTER TABLE networth_app_networthmilestone RENAME TO financials_app_financialsmilestone;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'networth_app_networthsnapshot') THEN
                        ALTER TABLE networth_app_networthsnapshot RENAME TO financials_app_financialssnapshot;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'networth_app_changelog') THEN
                        ALTER TABLE networth_app_changelog RENAME TO financials_app_changelog;
                    END IF;
                END $$;
            """,
            reverse_sql="""
                DO $$
                BEGIN
                    -- Reverse: rename back to networth_app
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financials_app_financialaccount') THEN
                        ALTER TABLE financials_app_financialaccount RENAME TO networth_app_financialaccount;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financials_app_accountsnapshot') THEN
                        ALTER TABLE financials_app_accountsnapshot RENAME TO networth_app_accountsnapshot;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financials_app_cashflowentry') THEN
                        ALTER TABLE financials_app_cashflowentry RENAME TO networth_app_cashflowentry;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financials_app_accountgroup') THEN
                        ALTER TABLE financials_app_accountgroup RENAME TO networth_app_accountgroup;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financials_app_accountgroup_accounts') THEN
                        ALTER TABLE financials_app_accountgroup_accounts RENAME TO networth_app_accountgroup_accounts;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financials_app_financialsmilestone') THEN
                        ALTER TABLE financials_app_financialsmilestone RENAME TO networth_app_networthmilestone;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financials_app_financialssnapshot') THEN
                        ALTER TABLE financials_app_financialssnapshot RENAME TO networth_app_networthsnapshot;
                    END IF;
                    
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financials_app_changelog') THEN
                        ALTER TABLE financials_app_changelog RENAME TO networth_app_changelog;
                    END IF;
                END $$;
            """,
        ),
    ]

