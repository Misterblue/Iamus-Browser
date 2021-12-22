# Iamus-Browser

This is a simple web page for testing [Vircadia] metaverse-servers.

Using the web page, point it at a compatable metaverse-server (most likely
an instance of [Iamus] ), log into an account and list the various
data structures available through the metaverse API.

# Building

This builds as a [NodeJS] application. Install a versions of Git and NPM and:

```
git clone https://github.com/Misterblue/Iamus-Browser.git
cd Iamus-Browser
npm install
npm run build
```

This will build the application into the `Iamus-Browser/dist` directory.

# Operation

Once built, use a web browser to open `Iamus-Browser/dist/index.html`.
You will be presented with a page with the metaverse URL at the top
and a selection of tabs under that.

For most operations, you need to
log into an account on the metaverse-server so enter a username 
and password in the "Login To Account" section and press "Login".
If successful, you will see the account and token information filled
in the "Logged In Account" section.

The "Tables" tab fetches and displays various data tables.

The "Delete" tab allows deleting objects using their IDs.
Of course, you need account permissions to modify the deleted items.

The "Raw" tab does simple GETs, POSTs, and database table lookups.
The database tables lookups can only be done by and admin account.

The "Stats" tab displays some statistics about the selected metaverse-server.

Selecting the "AsAdmin" button causes an "?asadmin" to be added to the request
which does the request with admin access if the logged in account has
admin privilages.

[NodeJS]: httos://nodejs.org
[Vircadia]: https://vircadia.com/
[Iamus]: https://github.com/Misterblue/Iamus


