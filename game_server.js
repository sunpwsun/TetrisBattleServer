/*
 * Online Game Server
 * 2018.01.13 : initial version
 * 2018.05.10 : MongoDB added for logging
 * 2018.05.24 : still working 
 * Wirtten by Jinuk Sun
 */

var prod = false;        // if prod is false, all logs will be written in console
                        // if prod is true,  all logs will be written in MongoDB and a log file


// Try to connect to MongoDB
var mongoose = require('mongoose');
var mongoDB;
connectMongoDB();


var express = require('express');
var http    = require('http');
var static  = require('serve-static');
var path    = require('path');
var bodyParser = require('body-parser'); 
var expressSession = require('express-session');
var fs      = require('fs');


var app = express();

// all logged users
var loggedUsers = [];

// users who move to game page
var gameUsers = [];

// battle rooms for tetris online
var tetrisBattleRooms = [];


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


app.set('port', process.env.PORT || 3000);
app.use(static(path.join(__dirname, 'public')));        // 05-08
app.use(bodyParser.urlencoded({extended:false}));       // to use parameters from body at post method
app.use(bodyParser.json());
app.use(expressSession({
    secret : 'tetris_key',
    resave : true,
    saveUninitialized : true
}));

var router = express.Router();



router.route('/tetris_battle').get( (req,res)=>{
    log( '───────────────────────────────────────────────────────────────────');
    log( '           ◈ Routing : /tetris_battle');

    if( req.session.user) {
        log("userid = " + req.session.user.id);
        res.writeHead(200, {"Content-Type":"text/html;charset=utf8"});

        req.app.render( 'tetris_battle', { userid : req.session.user.id, from : 'tetris_battle' }, (err, html)=>{
            if( err ) {

                log('Error during renderring the view : tetris_battle ' + err.message);
                return;
            }
            res.userId = req.session.user.id;
            res.end(html);

        });
    }
    else {
        res.redirect( '/login.html');
    }
});

router.route('/gamelist').get( (req,res)=>{
    log( '           ◈ Routing : /gamelist ');

    if( req.session.user) {
        //res.redirect( '/product.html');
        res.writeHead(200, {"Content-Type":"text/html;charset=utf8"});
        req.app.render( 'game_list', { userid : req.session.user.id }, (err, html)=>{
            if( err ) {

                log('Error during renderring the view : game_list');
                return;
            }

            res.end(html);
        });
    }
    else {
        res.redirect( '/login.html');
    }
});
router.route('/tetris_single').get( (req,res)=>{

    log( '───────────────────────────────────────────────────────────────────');
    log( '           ◈ Routing : /tetris_single ');

    if( req.session.user) {

        res.writeHead(200, {"Content-Type":"text/html;charset=utf8"});
        req.app.render( 'tetris_single', { userid : req.session.user.id, from : 'tetris_single'  }, (err, html)=>{
            if( err ) {

                log('Error during renderring the view : tetris_single');
                return;
            }

            res.end(html);
        });
    }
    else {
        res.redirect( '/login.html');
    }
});
router.route('/logout').get( (req,res)=>{

    if( req.session.user) {

        var id = req.session.user.id;
        loggedUsers.splice( loggedUsers.indexOf(id), 1 );

        req.session.destroy( (err)=>{

            if( err) {
                log( 'Error during deleting the session');
                return;
            }

            log( '    ┌─ (-) User Logged out ───────────────────────────' );
            log( '    │ ▷ id  : ' + id );
            log( '    │ ▷ Total : ' + loggedUsers.length );
            log( '    │ ▷ all : ' + loggedUsers );
            log( '    └─────────────────────────────────────────────────' );
            log( '');
           
            res.redirect( '/login.html' );
        });
    }
    else {

        //log( 'Not logged in');

        res.redirect( '/login.html');
    }
});
router.route('/login').post( (req,res)=> {

    var id = req.body.id;
    //var pw = req.body.password;


    // only user name( nickname ) is accepted at this version
    
    if( req.session.user) {
        log(' " └── Already logged in');

        res.redirect('/tetris_battle');
    }
    else {
        req.session.user = {
            id:id,
            authorized:true
        };

        loggedUsers.push(id);

        log( '    ┌─ (+) User Logged in ────────────────────────────' );
        log( '    │ ▷ id  : ' + id );
        log( '    │ ▷ Total : ' + loggedUsers.length );
        log( '    │ ▷ all : ' + loggedUsers );
        log( '    └─────────────────────────────────────────────────' );
        log( '');
        //res.redirect('/gamelist');
        res.redirect('/tetris_battle');
    }
});

app.use('/',router);


// Creates server here
var server = http.createServer(app);
/*var server = http.createServer(app).listen(app.get('port'), ()=>{
        log("            ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓" );
    log("            ┃     Hae Studio Game server running     ┃" );
    log("            ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛" );
});
*/


var io = require('socket.io')(server);
io.on('connection', function(socket) {

    var
    gameUser = {};
    gameUser.user_id    = socket.handshake.query['name'];
    gameUser.socketID   = socket.id;
    gameUser.roomID    = -1;
    gameUsers.push(gameUser);

    //gameUsers[socket.handshake.query['name']] = socket.id;

    log( '      ┌─ (+) connected ───────────────────────────────' );
    log( '      │  ◎ user id : ' + socket.handshake.query['name'] );
    log( '      │  ◎ socket id : ' + socket.id );
    log( '      │  ◎ All game users : ' + gameUsers.length + ' users');
    showGameUsers();


    socket.login_id = socket.handshake.query['name'];
    socket.roomID = -1;



    // send the battle room list to the connected user
    sendBattleRoomList(socket);


    socket.on('disconnect', ()=>{

        // user disconnected
        // if the user was in a battle room, it must be removed
        var user_room_id;
        for( i = 0 ; i < gameUsers.length ; i++ ) {

            //log( ' i = ' + i + ',  ' + gameUsers[i].user  );
            if( gameUsers[i].user_id ===  socket.handshake.query['name']  ) {

                // get the user's room ID
                user_room_id = gameUsers[i].roomID;

                // disconnected user's room id will be initialized by -1.
                gameUsers[i].roomID = -1;

                // remove the user from the game room
                gameUsers.splice( i, 1 );
                break;
            }
        }

        log( '      ┌─ (-) disconnected ────────────────────────────' );
        log( '      │  ◎ user id : ' + socket.handshake.query['name'] );
        log( '      │  ◎ socket id : ' + socket.id );
        log( '      │  ◎ All game users : ' + gameUsers.length + ' users');
        showGameUsers();


        // disconnected from a battle room
        // the user must be got out from the room
        // send a player a message that your opponent disconnected
        if( socket.handshake.query['from'] === 'tetris_battle' ) {
            log( 'from : ' + socket.handshake.query['from'] + ', length : ' + tetrisBattleRooms.length);
            for( j = 0 ; j < tetrisBattleRooms.length ; j++ ) {

                // seek a room the disconnected user was from
                if( user_room_id === tetrisBattleRooms.roomID ) {


                    for( i = 0 ; i < tetrisBattleRooms[j].users.length ; i++ ) {
                        //log( ' i = ' + i + ',  ' + gameUsers[i].user  );
                        if( tetrisBattleRooms[j].users[i] === socket.handshake.query['name']  ) {

                            tetrisBattleRooms[j].users.splice( i, 1 );
                            break;
                        }

                        // There is no player in the battle room, delete the room
                        if( tetrisBattleRooms[j].users.length === 0 ) {
                            log( '┌─ ▶ Battle Removed ◀  ───────────────────────' );
                            log( '│ ▷ Battle Name : ' + tetrisBattleRooms[j].name );
                            log( '└──────────────────────────────────────────────' );

                            tetrisBattleRooms.splice( j, 1);
                        }
                    }

                    break;
                }
            }
        }


    });

    socket.on('chat message', (msg)=>{
        log('message: ' + msg + ",  from : " + socket.id);
        io.emit('chat message', msg);
    });

    socket.on('private message', function (from, msg) {
        log('I received a private message by ', from, ' saying ', msg);
    });


    socket.on('game:tetris', (msg)=>{

        // to all client including me
        //io.socket.emit('game:tetris', msg);

        // to all client excluding me
        //socket.broadcast.emit('game:tetris', msg);


        if( msg.command === 'cells' ) {
            socket.broadcast.emit('game:tetris', msg);
        }
        else if( msg.command === 'attack' ) {
log('attack ' + msg.lines);
            socket.broadcast.emit('game:tetris', msg);
        }
        else if( msg.command === 'lost' ) {
log('lost');
            socket.broadcast.emit('game:tetris', msg);
        }

    });

    socket.on('game:tetris:createBattle', (msg)=>{

        if( io.sockets.adapter.rooms[msg.roomID]){

            // already the room exists
        }
        else {
            //var roomID = generateBattleRoom( msg );
            var roomID = "TETRIS_ROOM_" + Math.floor(Math.random() * 10000000);
            socket.join(roomID);
            io.sockets.adapter.rooms[roomID];
            io.sockets.adapter.rooms[roomID].roomID = roomID;
            io.sockets.adapter.rooms[roomID].name = msg.battle_name;
            io.sockets.adapter.rooms[roomID].w = msg.x;
            io.sockets.adapter.rooms[roomID].h = msg.y;
            io.sockets.adapter.rooms[roomID].level = msg.level;

        log("roomID : " + roomID + ",  name : " + io.sockets.adapter.rooms[roomID].name)   ;
        }

    });


    socket.on('game:tetris:joinRoom', (roomID)=>{

        socket.join(roomID);
        io.to(roomID).emit('game:tetris:startBattle','');

    });
});

server.listen(3000, function(){
    log("            ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓" );
    log("            ┃   Socket.io listening on * : 3000   ┃" );
    log("            ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛" );
    log("" );
});

function generateBattleRoom( msg ) {

    var newBattleRoom = {};
    newBattleRoom.roomID    = "TETRIS_ROOM_" + Math.floor(Math.random() * 10000000);
    newBattleRoom.name      = msg.battle_name;
    newBattleRoom.level     = msg.level;
    newBattleRoom.x         = msg.x;
    newBattleRoom.y         = msg.y;
    newBattleRoom.users     = new Array();
    newBattleRoom.users.push(msg.sender);

    tetrisBattleRooms.push( newBattleRoom );

    log( '┌─ ▶ New Battle Created ◀  ───────────────────' );
    log( '│ By ' +  msg.sender );
    log( '│ ▷ Battle Name : ' + msg.battle_name );
    log( '│ ▷ Level : ' + msg.level + ' ,  X : ' + msg.x + ' , Y : ' + msg.y );
    log( '│ ▷ Users : ' + newBattleRoom.users );
    log( '└──────────────────────────────────────────────' );
    //log(tetrisBattleRooms);

    return newBattleRoom.roomID;
}


function showGameUsers() {

    for( i = 0 ; i < gameUsers.length ; i++ )
//  log( '      │  ◎ All game users : ' + gameUsers.length + ' users');
    log( '      │       ─ game user[' + i + '] : ' + gameUsers[i].user_id );
    log( '      └───────────────────────────────────────────────' );
}




// when a user logs in, room list will be sent to the user
function sendBattleRoomList (socket ) {

    var rooms = [];
    Object.keys( io.sockets.adapter.rooms).forEach( (key) => {
        //log("" + io.sockets.adapter.rooms[key].name);//.substring(0, 7));
        // "TETRIS_ROOM_"

        //var id = "" + io.sockets.adapter.rooms[key].roomID;
        var id = "" + key;
log("id="+id + ",   id.substring(0, 12)="+id.substring(0, 12))    ;
        if( id.substring(0, 12) === "TETRIS_ROOM_")
            rooms.push(io.sockets.adapter.rooms[key]);
    });

    socket.emit('game:tetris:battleRoomList', rooms);


}


function connectMongoDB() {
    var dbUrl = 'mongodb://localhost:27017/local';

    mongoose.Promise = global.Promise;
    mongoose.connect( dbUrl );

    mongoDB = mongoose.connection;
    mongoDB.on('open', ()=> {

        console.log( 'Connected to ' + dbUrl );
    });

    mongoDB.on('disconnect', ()=> {

        console.log( 'Disonnected from ' + dbUrl );
    });

    mongoDB.on('error', ()=> {

        console.log( 'Error during connecting to MongoDB - ' + dbUrl );
        process.exit();
    });
}

function log( msg ) {

    if( prod ) {
        
        // try to insert the log msg into MongoDB
        addLog( mongoDB, msg, (err, res)=> {

            if( err ) {
                // write error in the log file
                console.log(msg);
                fs.writeFile('./log.txt', msg, { encoding:'utf8', flag:'a+'}, (err)=> {
        
                    if( err ) { 
                        console.log( 'Error : ' + err); 
                    }
                });

            }
        });

    }
    else {
        console.log(msg);
        fs.writeFile('./log.txt', msg, { encoding:'utf8', flag:'a+'}, (err)=> {

            if( err ) { 
                console.log( 'Error : ' + err); 
            }
        });
    }
}


function addLog( database, msg, callback) {

    var logColl = database.collection('logs');
    var logMag = { date : Date.now(), message : msg};

    logColl.insertOne(logMag, function(err, res) {
        
        // Error
        if( err ) {
            callback( err, null );
        } 
        
        // No error
        if( res.insertedCount > 0 ) {
            callback( null, res );
        }
        // No inserted record
        else {
            callback( null, null );
        }

    });
}