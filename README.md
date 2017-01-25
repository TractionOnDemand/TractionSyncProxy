**Sync Process Overview**
=========================

![](media/image1.png){width="0.7853379265091863in"
height="0.5492760279965004in"}![](media/image2.png){width="0.9218963254593175in"
height="0.43333333333333335in"}![](media/image3.png){width="0.5583333333333333in"
height="0.5583333333333333in"}![](media/image4.png){width="1.225in"
height="0.4083333333333333in"}

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

1)  SFCD sends export request to the Heroku server.

2)  Heroku performs OAuth request for both SF and Google.

3)  Heroku retrieves data from SFDC.

4)  Heroku create/update Google Sheet document.

5)  Heroku attaches Google Web App script to Google Sheet.

Update Process:
---------------

1)  Google Sheet triggers the Web App when document is updated.

2)  Google Web App sends notification to Heroku.

3)  Heroku retrieves modified data from Google Sheet.

4)  Heroku sends data update request to SFDC.

5)  Heroku updates Google Sheet with success/error message from SFDC.

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

1)  Install Heroku Command Line Tools:

    a.  <https://devcenter.heroku.com/articles/heroku-cli>

    b.  Download and Install

    c.  ![](media/image5.png){width="5.816666666666666in"
        height="2.877882764654418in"}

    d.  Select your Operating System

    e.  Run the installation

        i.  Note: you may have to run the installation as the Admin user
            of your computer

2)  Create a Heroku account.

    a.  <https://signup.heroku.com/login>

    b.  ![](media/image6.png){width="4.366666666666666in"
        height="3.3113888888888887in"}

3)  Create a new Heroku App <https://dashboard.heroku.com/new>.

    Refer to the official Heroku documentation for detailed help:
    <https://devcenter.heroku.com>

    a.  ![](media/image7.png){width="6.5in" height="3.125in"}

    b.  On the Settings tab, record the Domain of your new app.

        This will be referred to as &lt;HEROKU\_APP\_URL&gt; throughout
        this document.

4)  Add PostgreSQL to the Heroku app

    a.  From the ‘Resources’ tab, enter ‘Postgres’ into the Add-ons
        search and select ‘Heroku Postgres’ from the search results.

    b.  ![](media/image8.png){width="6.5in"
        height="2.709722222222222in"}

    c.  Pick your plan name and click the ‘Provision’ button.

        -   Eg. Pick “Hobby Dev” and click “Provision”

    d.  Click into the new Postgres Database: “Heroku Postgres ::
        Database”

    e.  From the new datastore page, scroll down and click the ‘View
        Credentials’ button.

    f.  ![](media/image9.png){width="6.5in"
        height="5.800694444444445in"}

    g.  The URI value is the &lt;DATABASE\_URL&gt;

5)  Setup Environment Variables.

    a.  From the settings tab, click ‘Reveal Config Vars’

    b.  ![](media/image10.png){width="5.254080271216098in"
        height="2.375in"}

    c.  add a new variable for the following KEY = VALUE pair

        NODE\_PATH = ./server

6)  Install Git on your local machine, if not already installed.

    a.  <https://git-scm.com/download/>

    b.  Select your Operating System and download.

    c.  ![](media/image11.png){width="6.5in" height="3.21875in"}

    d.  Run the setup wizard.

7)  Install node.js, if not already installed.

    a.  In a browser, go to: <https://nodejs.org/en/download/>

    b.  Select your Operating System and download.

    c.  ![](media/image12.png){width="5.091666666666667in"
        height="3.5418635170603676in"}

    d.  Run the setup wizard.

8)  Checkout the node.js server from GitHub.

    a.  Open the new Git bash console that you installed.

    b.  ![](media/image13.png){width="6.009665354330709in"
        height="3.31208552055993in"}

    c.  Navigate to the folder where you want to copy the node.js server

    d.  Type in the command prompt:

        **git clone
        <https://github.com/TractionOnDemand/TractionSyncProxy.git>**

9)  CD into the repo directory

    a.  Type in the command prompt:

        **cd TractionSyncProxy**

10) Add heroku as a remote.

    a.  Type in the command prompt:

        **git remote add heroku
        [https://git.heroku.com/&lt;HEROKU\_APP\_NAME&gt;.git](https://git.heroku.com/%3cHEROKU_APP_NAME%3e.git)**

    b.  If you are a windows user, you may be asked to authenticate. You
        must authenticate from the command prompt, rather than the Git
        bash console.

        i.  Open the command prompt cmd.exe

        ii. Navigate to the TractionSyncProxy directory you created.

        iii. Type the command:

            **heroku login**

11) Push to your heroku app.

    a.  Type in the command prompt:

        **git push heroku**

12) Run the database setup.

    a.  Use the URL that you copied from step 3a) above.

    b.  Open the URL in a browser: &lt;HEROKU\_APP\_URL&gt;/pg/setup\_db

    c.  optionally disable the setup in ./router/pg.js to prevent setup
        from running again.\
        (will need to commit/push the change).

### **salesforce.com Setup**

1)  Install the Managed Package.

    a.  https://login.salesforce.com/packaging/installPackage.apexp?p0=04t50000000RXpc

    b.  Click to install for all users.

    c.  You will be prompted to Approve Third-Party Access:

    d.  ![](media/image14.png){width="6.5in"
        height="4.896527777777778in"}

    e.  Select Yes, grant access… and click “Continue”

2)  Add the Custom Setting default value for the Heroku Endpoint URL.

    a.  Go to: Setup -&gt; Develop -&gt; Custom Settings Google Sheet
        Sync (Manage)

    b.  ![](media/image15.png){width="6.1in"
        height="2.9991666666666665in"}

    c.  Add a new default organization level value:

        Endpoint URL = &lt;HEROKU\_APP\_URL&gt;/salesforce\
        (e.g. [https://
        your-heroku-app-name.herokuapp.com/salesforce](https://my-new-app.herokuapp.com/salesforce))

3)  Add the Heroku App as a Connected App in SalesForce

    a.  Setup -&gt; Create -&gt; Apps -&gt; Connected Apps (New).

    b.  Enable OAuth Settings.

        i.  Provide a name for the connected app (you can use your app
            name).

        ii. Enter your email address

        iii. Callback URL = &lt;HEROKU\_APP\_URL&gt;/salesforce/oauth

        iv. Selected OAuth Scopes

-   Full access (full)

-   Perform requests on your behalf at any time (refresh\_token,
    offline\_access)

    a.  Record the ‘Consumer Key’ and ‘Consumer Secret’ for the next
        step.

1)  Back on your Heroku app, add the following environment variables:

    a.  Heroku &gt; Settings &gt; click “Reveal Config Vars”

        SF\_LOGIN\_URL = https://login.salesforce.com/services/oauth2

        SF\_REDIRECT\_URI = &lt;HEROKU\_APP\_URL&gt;/salesforce/oauth

        *\* note that you must include the “https://” in the URI*

        SF\_KEY = use the ‘Consumer Key’ from the previous step.

        SF\_SECRET = use the ‘Consumer Secret’ from the previous step.

2)  Update the ‘Heroku Sync’ Remote Site settings with your Heroku App
    URL

    a.  In Salesforce go to: Setup -&gt; Security Controls &gt; Remote
        Site Settings -&gt; Heroku Sync -&gt; Edit

        Remote Site URL = &lt;HEROKU\_APP\_URL&gt;

3)  Add the ‘List View Exporter’ Lightning component to the Opportunity
    page layout

    a.  Switch to Lightning Experience if not already enabled.

        i.  Click on your name at the top of the screen.

        ii. Select “Switch to Lightning Experience”

    b.  Go to an Opportunity record page.

    c.  Click on the Gear icon at the top of the page -&gt; Select “Edit
        Page”

    d.  If you have not already done so, you will have to register a
        custom domain in order to add the custom lightning component.

        i.  Click on “Deploy My Domain” on the left navigation bar under
            “Custom”

        ii. Enter a domain name.

        iii. You will have to wait until the domain is registered.

        iv. Navigate back to the Opportunity Record page.

        v.  Click to Edit the page

        vi. Click on “Deploy My Domain” again.

        vii. Click on “Deploy to users”.

    e.  Drag/Drop the ListViewExporter component onto the Opportunity
        page layout.

        i.  Navigate back to the Opportunity Record page.

        ii. Click to Edit the page

        iii. Drag the “List View Exporter” component onto the page
            layout.

        iv. Click Save

        v.  Click “Activate”

        vi. Select “Assign this page as the default record page” &gt;
            Save

        vii. Click Save

    f.  (optional) set the components configurable text labels.

    g.  Click “Save”.

### **Google Web App Setup**

1)  Create a project:

    a.  open the Developer Console:
        <https://console.developers.google.com>

    b.  select ‘Create project’ from the menu dropdown.

    c.  ![](media/image16.png){width="6.5in"
        height="3.459722222222222in"}

    d.  Enter a project name then click ‘Create’ (this might take a few
        minutes)

2)  Enable Drive API and Sheets API

    a.  b.  ![](media/image17.png){width="6.5in"
        height="2.9770833333333333in"}

3)  Click ‘Credentials’ from the nav menu.

4)  Setup Credentials

    a.  On the Credentials tab, select ‘OAuth client ID’ from the
        ‘Create credentials’ dropdown.

    b.  Select ‘Web application’

    c.  Enter a name for the web application

    d.  Set the ‘Authorized JavaScript Origins: &lt;HEROKU\_APP\_URL&gt;

        i.  This may not be required.

    e.  Set the ‘Authorized redirect URI’ to:
        &lt;HEROKU\_APP\_URL&gt;/google/callback

    f.  Click Create

    g.  Record the Client ID and Client Secret.

        (referred to as &lt;GOOGLE\_CLIENT\_ID&gt; and
        &lt;GOOGLE\_CLIENT\_SECRET&gt; in this document).

5)  On the ‘OAuth consent screen’ tab, enter all appropriate fields

    a.  Enter the Product name shown to users

    b.  Click Save

6)  Create a new Google Doc on your Google Drive.

    a.  Navigate to drive.google.com

    b.  Click “New” &gt; select “Google Doc”

7)  From the Tools menu, select ‘Script editor…’

    a.  ![](media/image18.png){width="6.5in"
        height="3.5479166666666666in"}

    b.  This will open a Google doc called “Code.js”

8)  Copy/paste the contents of
    &lt;GIT\_PROJECT\_FOLDER&gt;/webapp/google\_sync\_apps.gs into the
    Code.js Google Doc

    a.  Remove the current text from the file and replace with the text
        from the google\_sync\_apps.gs file.

9)  Save the project: File -&gt; Save

    a.  You will be asked to provide a name for the doc.

    b.  Eg. SFDC Script Doc

10) Add the Heroku app URL to Script Properties:

    a.  File -&gt; Project Properties

    b.  Click on the “Script Properties” tab

    c.  ![](media/image19.png){width="6.5in" height="4.0875in"}

    d.  on the “Script properties” tab, add a new row with the following
        Property = Value:

        (remove any trailing slash from the URL)

        HEROKU\_APP\_URL = &lt;HEROKU\_APP\_URL&gt;

11) Publish the app:

    a.  Click on the “Publish” tab and select “Deploy as web app”

    b.  ![](media/image20.png){width="6.5in"
        height="2.7493055555555554in"}

    c.  Select the following preferences:

        i.  Project version = New

        ii. Execute the app as: User accessing the web app

        iii. Who has access to the app: Anyone

    d.  ![](media/image21.png){width="3.168099300087489in"
        height="3.7333333333333334in"}

    e.  Click to review your permissions in the prompt that asks for
        permission to access your data on google.

        i.  Click to Allow

12) Copy the web app URL (referred to as &lt;GOOGLE\_WEBAPP\_URL&gt;)
    for entering into Heroku as a Config variable in the next steps.

13) In your Heroku app, you will add additional Configuration Variables:

    a.  Go into your Heroku app in a browser

        i.  Click on the Settings tab

        ii. Click on “Reveal Config Vars”

        iii. Create a new Config variable: GOOGLE\_CLIENT\_ID

    b.  Go to the Google Developer Console in another tab in your
        browser

        i.  Click on the Credentials tab

        ii. Click on your Oauth 2.0 app credentials

        iii. Copy the Google Client ID

    c.  In the Heroku app, paste the Google Client ID into the Config
        variable

        i.  Click “Add”

        ii. Create a new Config variable: GOOGLE\_CLIENT\_SECRET

        iii. In the Google Developer console copy the Client secret and
            paste it as the value in the config variable.

    d.  In the Heroku app, click to “Add” another Config variable:
        GOOGLE\_CALLBACK\_URL

        i.  In the Google Developer console copy the “Authorized redict
            URIs” and paste into the GOOGLE\_CALLBACK\_URL in the latest
            Heroku Config variable.

    e.  Click to “Add” another Config Variable: GOOGLE\_WEBAPP\_URL

        i.  Paste the Google WebApp URL that you copied from the
            document app deployment into the GOOGLE\_WEBAPP\_URL in the
            Heroku config variables.

    f.  You should now have the following 4 additional config variables
        set in Heroku:

        GOOGLE\_CLIENT\_ID = &lt;GOOGLE\_CLIENT\_ID&gt;

        GOOGLE\_CLIENT\_SECRET = &lt;GOOGLE\_CLIENT\_SECRET&gt;

        GOOGLE\_CALLBACK\_URL = &lt;HEROKU\_APP\_URL&gt;/google/callback

        GOOGLE\_WEBAPP\_URL = &lt;GOOGLE\_WEBAPP\_URL&gt;

### **Congratulations!!**

You have now successfully configured the apps. To use the app:

32) Open your Salesforce org.

33) Go into an Opportunity

34) ![](media/image22.png){width="6.467941819772529in"
    height="4.697329396325459in"}

35) Select the list view to export and click on the “Export to Google”
    button

36) Note that several permission screens will be displayed.

37) You will have to accept to Leave Salesforce.

38) ![](media/image23.png){width="6.5in" height="2.326388888888889in"}

39) Click Continue

40) You may have to select your Google Account to generate the Google
    Sheet in, if you have multiple accounts.

41) Select the appropriate account.

42) You will then have to click to review permissions of the Google App
    in order to access data on your Google account.

43) ![](media/image24.png){width="5.499312117235346in"
    height="2.562179571303587in"}

44) Click “Review Permissions”

45) You will then have to allow the Google App to view and manage your
    spreadsheets in Google Drive, etc.

46) ![](media/image25.png){width="6.5in" height="5.553472222222222in"}

47) Click “Allow”

48) A workflow will then be displayed indicating what is taking place.

    a.  Create Google Sheet

    b.  Write Data to Sheet

    c.  Open Google Sheet

49) ![](media/image26.png){width="6.5in" height="0.6458333333333334in"}

50) Once this has completed a new Google Sheet will open containing all
    of the Opportunities from the List View that you selected to export.

    ![](media/image27.png){width="7.591666666666667in"
    height="2.1250174978127734in"}

51) You can now edit each of the Opportunity records inline and all of
    the changes will be pushed back into Salesforce!

    a.  Picklist values will be presented according to your fields in
        Salesforce

    b.  Validation rules will be respected when attempting to make
        changes.

    c.  When a record is updated the “sync\_status” field/column will be
        updated to indicate that the changes have been synced back to
        Salesforce.


