**Sync Process Overview**
=========================

![](/documentation/media/image1.png)


Overview:
---------

The Salesforce.com – Google Sheets Data Synchronization app allows Sales
teams to export their Sales data from Salesforce to a Google Sheet,
update the data for multiple records in one sheet and have those updates
reflected back in Salesforce automatically. Required fields and picklist
values are respected in Google sheets, saving time and avoiding
pollution of your Salesforce environment with dirty data.

Export Process:
---------------

1) SFCD sends export request to the Heroku server.

2) Heroku performs OAuth request for both SF and Google.

3) Heroku retrieves data from SFDC.

4) Heroku create/update Google Sheet document.

5) Heroku attaches Google Web App script to Google Sheet.

Update Process:
---------------

1) Google Sheet triggers the Web App when document is updated.

2) Google Web App sends notification to Heroku.

3) Heroku retrieves modified data from Google Sheet.

4) Heroku sends data update request to SFDC.

5) Heroku updates Google Sheet with success/error message from SFDC.

Heroku Sync Proxy
=================

This is a node.js server that acts as a broker between salesforce.com
and Google Sheets. It handles all the export and update requests,
manages credentials, and displays progress to the user during exports.

The source code (and an up-to-date version of this document) can be
found on GitHub: <https://github.com/TractionOnDemand/TractionSyncProxy>

SalesForce Exporter
===================

This is primarily a Lightning component that sits on the Opportunity
page layout. It makes a POST to the Heroku app to initiate a LIstView
export.

Google Web App
==============

This web app detects change events on the Google Sheet and sends
notifications to the Heroku app when such changes occur.

**Step by Step Deployment Instructions**
========================================

### **Heroku Setup**

1) Download and Install Heroku Command Line Tools from: <https://devcenter.heroku.com/articles/heroku-cli>

![](/documentation/media/image2.png)

    a.  Select your Operating System

    b.  Run the installation

        i.  Note: you may have to run the installation as the Admin user
            of your computer

2) Create a Heroku account: <https://signup.heroku.com/login>

![](/documentation/media/image3.png)


3) Create a new Heroku App: <https://dashboard.heroku.com/new>

    a. Refer to the official Heroku documentation for detailed help: https://devcenter.heroku.com

![](/documentation/media/image4.png)

    b.  On the Settings tab, record the Domain of your new app.

        This will be referred to as <HEROKU_APP_URL> throughout
        this document.

4) Add PostgreSQL to the Heroku app

    a.  From the ‘Resources’ tab, enter ‘Postgres’ into the Add-ons
        search and select ‘Heroku Postgres’ from the search results.

![](/documentation/media/image5.png)

    b.  Pick your plan name and click the ‘Provision’ button.

        -   Eg. Pick “Hobby Dev” and click “Provision”

    c.  Click into the new Postgres Database: “Heroku Postgres :: Database”

    d.  From the new datastore page, scroll down and click the ‘View Credentials’ button.

![](/documentation/media/image6.png)

    e.  The URI value is the <DATABASE_URL>

5) Setup Environment Variables.

    a.  From the settings tab, click ‘Reveal Config Vars’

![](/documentation/media/image7.png)


    b.  add a new variable for the following KEY = VALUE pair

        NODE_PATH = ./server

6) Download and Install Git on your local machine: <https://git-scm.com/download/>

![](/documentation/media/image8.png)


7) Install node.js, if not already installed.

    a.  In a browser, go to: https://nodejs.org/en/download/

    b.  Select your Operating System and download.

![](/documentation/media/image9.png)

    c.  Run the setup wizard.

8) Checkout the node.js server from GitHub.

    a.  Open the new Git bash console that you installed.

![](/documentation/media/image10.png)

    b.  Navigate to the folder where you want to copy the node.js server

    c.  Type in the command prompt:

        git clone https://github.com/TractionOnDemand/TractionSyncProxy.git

9) CD into the repo directory

    a.  Type in the command prompt:

        cd TractionSyncProxy

10) Add heroku as a remote.

    a.  Type in the command prompt:

        git remote add heroku https://git.heroku.com/<HEROKU_APP_NAME>.git

    b.  If you are a windows user, you may be asked to authenticate. You
        must authenticate from the command prompt, rather than the Git
        bash console.

        i.  Open the command prompt cmd.exe

        ii. Navigate to the TractionSyncProxy directory you created.

        iii. Type the command:

            heroku login

11) Push to your heroku app.

    a.  Type in the command prompt:

        git push heroku

12) Run the database setup.

    a.  Use the URL that you copied from step 3a) above.

    b.  Open the URL in a browser: <HEROKU_APP_URL>/pg/setup_db

    c.  optionally disable the setup in ./router/pg.js to prevent setup from running again.
        (will need to commit/push the change).

### **salesforce.com Setup**

13) Install the Managed Package.

    a.  https://login.salesforce.com/packaging/installPackage.apexp?p0=04t50000000RXpc

    b.  Click to install for all users.

    c.  You will be prompted to Approve Third-Party Access:

![](/documentation/media/image11.png)


    d.  Select Yes, grant access… and click “Continue”

14) Add the Custom Setting default value for the Heroku Endpoint URL.

    a.  Go to: Setup -> Develop -> Custom Settings Google Sheet
        Sync (Manage)

![](/documentation/media/image12.png)


    b.  Add a new default organization level value:

        Endpoint URL = <HEROKU_APP_URL>/salesforce
        (e.g. https://your-heroku-app-name.herokuapp.com/salesforce)

15) Add the Heroku App as a Connected App in SalesForce

    a.  Setup -> Create -> Apps -> Connected Apps (New).

    b.  Enable OAuth Settings.

        i.  Provide a name for the connected app (you can use your app name).

        ii. Enter your email address

        iii. Callback URL = <HEROKU_APP_URL>/salesforce/oauth

        iv. Selected OAuth Scopes

-   Full access (full)

-   Perform requests on your behalf at any time (refresh_token,
    offline_access)

    a.  Record the ‘Consumer Key’ and ‘Consumer Secret’ for the next
        step.

16) Back on your Heroku app, add the following environment variables:

    a.  Heroku > Settings > click “Reveal Config Vars”

        SF_LOGIN_URL = https://login.salesforce.com/services/oauth2

        SF_REDIRECT_URI = <HEROKU_APP_URL>/salesforce/oauth

        * note that you must include the “https://” in the URI*

        SF_KEY = use the ‘Consumer Key’ from the previous step.

        SF_SECRET = use the ‘Consumer Secret’ from the previous step.

17) Update the ‘Heroku Sync’ Remote Site settings with your Heroku App
    URL

    a.  In Salesforce go to: Setup -> Security Controls > Remote
        Site Settings -> Heroku Sync -> Edit

        Remote Site URL = <HEROKU_APP_URL>

18) Add the ‘List View Exporter’ Lightning component to the Opportunity
    page layout

    a.  Switch to Lightning Experience if not already enabled.

        i.  Click on your name at the top of the screen.

        ii. Select “Switch to Lightning Experience”

    b.  Go to an Opportunity record page.

    c.  Click on the Gear icon at the top of the page -> Select “Edit Page”

    d.  If you have not already done so, you will have to register a
        custom domain in order to add the custom lightning component.

        i.  Click on “Deploy My Domain” on the left navigation bar under “Custom”

        ii. Enter a domain name.

        iii. You will have to wait until the domain is registered.

        iv. Navigate back to the Opportunity Record page.

        v.  Click to Edit the page

        vi. Click on “Deploy My Domain” again.

        vii. Click on “Deploy to users”.

    e.  Drag/Drop the ListViewExporter component onto the Opportunity page layout.

        i.  Navigate back to the Opportunity Record page.

        ii. Click to Edit the page

        iii. Drag the “List View Exporter” component onto the page layout.

        iv. Click Save

        v.  Click “Activate”

        vi. Select “Assign this page as the default record page” > Save

        vii. Click Save

    f.  (optional) set the components configurable text labels.

    g.  Click “Save”.

### **Google Web App Setup**

19) Create a project:

    a.  open the Developer Console: https://console.developers.google.com

    b.  select ‘Create project’ from the menu dropdown.

![](/documentation/media/image13.png)

    c.  Enter a project name then click ‘Create’ (this might take a few minutes)

20) Enable Drive API and Sheets API

![](/documentation/media/image14.png)


21) Click ‘Credentials’ from the nav menu.

22) Setup Credentials

    a.  On the Credentials tab, select ‘OAuth client ID’ from the
        ‘Create credentials’ dropdown.

    b.  Select ‘Web application’

    c.  Enter a name for the web application

    d.  Set the ‘Authorized JavaScript Origins: <HEROKU_APP_URL>

        i.  This may not be required.

    e.  Set the ‘Authorized redirect URI’ to:
        <HEROKU_APP_URL>/google/callback

    f.  Click Create

    g.  Record the Client ID and Client Secret.

        (referred to as <GOOGLE_CLIENT_ID> and
        <GOOGLE_CLIENT_SECRET> in this document).

23) On the ‘OAuth consent screen’ tab, enter all appropriate fields

    a.  Enter the Product name shown to users

    b.  Click Save

24) Create a new Google Doc on your Google Drive.

    a.  Navigate to drive.google.com

    b.  Click “New” > select “Google Doc”

25) From the Tools menu, select ‘Script editor…’

![](/documentation/media/image15.png)

    a.  This will open a Google doc called “Code.js”

26) Copy/paste the contents of
    <GIT_PROJECT_FOLDER>/webapp/google_sync_apps.gs into the Code.js Google Doc

    a.  Remove the current text from the file and replace with the text
        from the google_sync_apps.gs file.

27) Save the project: File -> Save

    a.  You will be asked to provide a name for the doc.

    b.  Eg. SFDC Script Doc

28) Add the Heroku app URL to Script Properties:

    a.  File -> Project Properties

    b.  Click on the “Script Properties” tab

![](/documentation/media/image16.png)

    c.  on the “Script properties” tab, add a new row with the following Property = Value:

        (remove any trailing slash from the URL)

        HEROKU_APP_URL = <HEROKU_APP_URL>

29) Publish the app:

    a.  Click on the “Publish” tab and select “Deploy as web app”

![](/documentation/media/image17.png)


    b.  Select the following preferences:

        i.  Project version = New

        ii. Execute the app as: User accessing the web app

        iii. Who has access to the app: Anyone

![](/documentation/media/image18.png)


    c.  Click to review your permissions in the prompt that asks for
        permission to access your data on google.

        i.  Click to Allow

30) Copy the web app URL (referred to as <GOOGLE_WEBAPP_URL>)
    for entering into Heroku as a Config variable in the next steps.

31) In your Heroku app, you will add additional Configuration Variables:

    a.  Go into your Heroku app in a browser

        i.  Click on the Settings tab

        ii. Click on “Reveal Config Vars”

        iii. Create a new Config variable: GOOGLE_CLIENT_ID

    b.  Go to the Google Developer Console in another tab in your browser

        i.  Click on the Credentials tab

        ii. Click on your Oauth 2.0 app credentials

        iii. Copy the Google Client ID

    c.  In the Heroku app, paste the Google Client ID into the Config variable

        i.  Click “Add”

        ii. Create a new Config variable: GOOGLE_CLIENT_SECRET

        iii. In the Google Developer console copy the Client secret and
            paste it as the value in the config variable.

    d.  In the Heroku app, click to “Add” another Config variable:
        GOOGLE_CALLBACK_URL

        i.  In the Google Developer console copy the “Authorized redict
            URIs” and paste into the GOOGLE_CALLBACK_URL in the latest
            Heroku Config variable.

    e.  Click to “Add” another Config Variable: GOOGLE_WEBAPP_URL

        i.  Paste the Google WebApp URL that you copied from the
            document app deployment into the GOOGLE_WEBAPP_URL in the
            Heroku config variables.

    f.  You should now have the following 4 additional config variables set in Heroku:

        GOOGLE_CLIENT_ID = <GOOGLE_CLIENT_ID>

        GOOGLE_CLIENT_SECRET = <GOOGLE_CLIENT_SECRET>

        GOOGLE_CALLBACK_URL = <HEROKU_APP_URL>/google/callback

        GOOGLE_WEBAPP_URL = <GOOGLE_WEBAPP_URL>

### **Congratulations!!**

You have now successfully configured the apps. To use the app:

32) Open your Salesforce org.

33) Go into an Opportunity

![](/documentation/media/image19.png)


34) Select the list view to export and click on the “Export to Google” button

35) Note that several permission screens will be displayed.

36) You will have to accept to Leave Salesforce.

![](/documentation/media/image20.png)


37) Click Continue

38) You may have to select your Google Account to generate the Google
    Sheet in, if you have multiple accounts.

39) Select the appropriate account.

40) You will then have to click to review permissions of the Google App
    in order to access data on your Google account.

![](/documentation/media/image21.png)


41) Click “Review Permissions”

42) You will then have to allow the Google App to view and manage your
    spreadsheets in Google Drive, etc.

![](/documentation/media/image22.png)


43) Click “Allow”

44) A workflow will then be displayed indicating what is taking place.

    a.  Create Google Sheet

    b.  Write Data to Sheet

    c.  Open Google Sheet

![](/documentation/media/image23.png)


45) Once this has completed a new Google Sheet will open containing all
    of the Opportunities from the List View that you selected to export.

![](/documentation/media/image24.png)


46) You can now edit each of the Opportunity records inline and all of
    the changes will be pushed back into Salesforce!

    a.  Picklist values will be presented according to your fields in
        Salesforce

    b.  Validation rules will be respected when attempting to make
        changes.

    c.  When a record is updated the “sync_status” field/column will be
        updated to indicate that the changes have been synced back to
        Salesforce.


