
document.addEventListener("DOMContentLoaded", gameInit);

var imgBrick = new Array();



var gameTimer;
var gameTimerSpeed;
var gameCnt;
var canvas; 
var ctx;   

var gameOver;
var won;                    // true:won or false:lost
var level = 0;
var cells;					// 2D array for my play
//var opponentCells;			// 2D array for opponent's play
var nextBricksType;				// next three bricks
var score;						
var stage;
var intervalDown;				// time interval of a brick down
var currBrickType;					// type of current moving brick


var currBrick;


// Start Game
//gameInit();

// timer

// event
window.addEventListener( 'keydown', moveBrick );







function moveBrick() {

    if( gameOver )
        return;


    // SPACE BAR
    if( event.keyCode === 32 ) {
        
        var smallgestPosY = 100;

        for( var i = 0 ; i < 4 ; i++ )
            if( currBrick.currPosY[ i ] < smallgestPosY )
                smallgestPosY = currBrick.currPosY[ i ];

        for( var y = smallgestPosY; y < numOfY ; y++ ) {

            if( checkMovable( "Down" ) ) {
                currBrick.moveDown();
            }
            else {      // 내려올 수 있을만큼 내려왔다. 다음 블럭 만들어서 내려보내기

                pinCurrBrickToCells();
                checkLineFull();
                generateNextBricks();

                break;
            }
        }
    }
    // LEFT
    else if( event.keyCode === 37 ) {
            
        if( checkMovable( "Left" ) ) {
            currBrick.moveToLeft();
        }
    }
    // RIGHT
    else if( event.keyCode === 39 ) {
  
        if( checkMovable( "Right" ) ) {				
            currBrick.moveToRight();
        }
    }
    // UP
    else if( event.keyCode === 38 ) {   
          
        currBrick.rotateBrick();    
    }
    // DOWN
    else if( event.keyCode === 40 ) {  
            
        if( checkMovable( "Down" ) ) {

            currBrick.moveDown();
        }
        else {      // 내려올 수 있을만큼 내려왔다. 다음 블럭 만들어서 내려보내기

            pinCurrBrickToCells();
            checkLineFull();
            generateNextBricksType();
        }  
    }
            
    // debuging         
    // Page Up : 33      
    // Page Down : 34
    else if( event.keyCode === 33 ) {     

    }
    else if( event.keyCode === 34 ) {     

    }
    
    checkGameOver();
    
    drawAll();
}
function clearScreen() {

    // clear canvas
    ctx.drawImage( imgBg, 0, 0, imgBg.width, imgBg.height);
    console.log( "img w=" +  imgBg.width + ", "+ imgBg.height );

}   
function drawPanel() {

    // draws my Panel
    ctx.drawImage( imgPanel, myPanelX, myPanelY, imgPanel.width, imgPanel.height);

    // draws opponent's Panel
    ctx.drawImage( imgPanel, opponentPanelX, opponentPanelY, imgPanel.width, imgPanel.height);

    // draws my name and opponent's name
    ctx.drawImage( imgNamePanel,52, 11,imgNamePanel.width, imgNamePanel.height );
    ctx.drawImage( imgNamePanel,593, 11,imgNamePanel.width, imgNamePanel.height );
    ctx.textAlign="center";
    ctx.font="30px Arial bold";
    ctx.fillStyle = "#ffff00"

    if( myName )
        ctx.fillText( myName, 212, 48);
    if( oppoName )
        ctx.fillText( oppoName, 754, 48);
    
}
function drawStackedBricks() {
				
    for( var i = 0 ; i < numOfX ; i++ ) {

        for( var j = 4 ; j < numOfY ; j++ ) {

            if( cells[ i ][ j ] >= 0 ) {

                ctx.drawImage( imgBrick[ cells[ i ][ j ] ], 
                                myPanelX  + mySquareLen * i,
                                myPanelY  + mySquareLen * (j-4),
                                mySquareLen,
                                mySquareLen );                                     
            }
        }
    }	
}
function drawOppoBricks() {
	
    // draws a opponent's bricks
    for( var i = 0 ; i < numOfX ; i++ ) {

        for( var j = 4 ; j < numOfY ; j++ ) {

            if( opponentCells[ i ][ j ] >= 0 ) {
                          
                ctx.drawImage( imgBrick[ opponentCells[ i ][ j ] ], 
                            opponentPanelX  + oppoSquareLen * i,
                            opponentPanelY  + oppoSquareLen * (j-4),
                            oppoSquareLen,
                            oppoSquareLen );             

            }
        }
    }
}
function drawMessage(msgType){

    var msg;
    if( msgType === "WAITING")
        msg = "Waiting for Opponent";
    else if( msgType === "LOST")
        msg = "You Lost!";
    else if( msgType === "WON")
        msg = "You Won!";
    console.log("---" + msg);
    // draws a black filled box
   
    ctx.fillStyle = "#000000";
    ctx.fillRect( frameSizeX/10*3, frameSizeY/8*3, frameSizeX/10*4, frameSizeY/8*2 );
    
    // draw a white rectagle
    ctx.strokeStyle = "#8f0000";
    ctx.lineWidth = 3;
    ctx.strokeRect( frameSizeX/10*3, frameSizeY/8*3, frameSizeX/10*4, frameSizeY/8*2 );
   
    // draws a message
    ctx.textAlign="center";
    ctx.font="30px Arial bold";
    ctx.fillStyle = "#ffff00"
    ctx.fillText(msg,frameSizeX/2,frameSizeY/2); 
}
function runningBrick() {

    ctx.fillStyle = currBrick.color;
    
    for( var i = 0 ; i < 4 ; i++ ) {

        if( currBrick.currPosY[i] > 3) {

            ctx.drawImage( imgBrick[ currBrick.type ], 
                            myPanelX + mySquareLen * currBrick.currPosX[ i ], 
                            myPanelY + mySquareLen * (currBrick.currPosY[ i ]-4), 
                            mySquareLen,
                            mySquareLen );
        }
    }
}
function drawNextBricks() {

    for( var j = 0 ; j < 3 ; j++ ) {

        ctx.fillStyle = brickColors[ nextBricksType[ j ] ];
		

        for( var i = 0 ; i < 4 ; i++ ) {

            ctx.drawImage( imgBrick[ nextBricksType[ j ] ],
                nextBrickPanelX + 75 - centerPosX[ nextBricksType[ j ] ] * nextBrickLength +  ( nextBrickLength ) * ( squarePosX[ nextBricksType[ j ] ][ 0 ][ i ] - 3 ) + 2, 
                150 * ( 2 - j ) + nextBrickPanelY  + 75 - centerPosY[ nextBricksType[ j ] ] * nextBrickLength + ( nextBrickLength + 1 ) * ( squarePosY[ nextBricksType[ j ] ][ 0 ][ i ] ), 
                nextBrickLength, 
                nextBrickLength );
    
        }	
    }
}   
function drawAll() {

    // clears screen
    clearScreen();
    
    drawPanel();					// draws my Panel and opponent's panel
    drawStackedBricks();			// draws stacked bricks
    drawOppoBricks();				// draws a opponent's bricks
    runningBrick();					// draws a running brick
    drawNextBricks();				// draws next bricks


    if( gameOver ) {
        if( won ) {
            drawMessage("WON");
        }
        else {
            drawMessage("LOST");
        }
    }
}
function checkMovable( key ) {
				
    if( key === "Up" ) {			
        
        for( var i = 0 ; i < 4 ; i++ ) {						
            
            if( currBrick.currPosY[ i ] === 0 )
                return false;
        }
    }
    else if( key === "Down" ) {			
        
        for( var i = 0 ; i < 4 ; i++ ) {						
            
            if( currBrick.currPosY[ i ] >= numOfY - 1 )
                return false;

            //블럭 바로 하단에 다른 블럭이 있는지 확인
            if( cells[ currBrick.currPosX[ i ] ][ currBrick.currPosY[ i ] + 1 ] >= 0 )
                return false;
        }
    }
    else if( key === "Left" ) {							
    
        for( var i = 0 ; i < 4 ; i++ ) {
        
            // 블럭이 가장 좌측에 있는지 확인
            if( currBrick.currPosX[ i ] <= 0 )
                return false;
    
            //블럭 바로 좌측에 다른 블럭이 있는지 확인
            if( cells[ currBrick.currPosX[ i ] - 1 ][ currBrick.currPosY[ i ] ] >= 0 )
                return false;
    
        }	
    }
    else if( key === "Right" ) {							
        
        // 블럭이 가장 우측에 있는지 확인
        for( var i = 0 ; i < 4 ; i++ ) {
            
            if( currBrick.currPosX[ i ] >= numOfX - 1 )
                return false;
    
            //블럭 바로 우측에 다른 블럭이 있는지 확인
            if( cells[ currBrick.currPosX[ i ] + 1 ][ currBrick.currPosY[ i ] ] >= 0 )
                return false;

        }
    }
    
    return true;
}
function pinCurrBrickToCells() {
		
    for( var i = 0 ; i < 4 ; i++ ) {
        
        cells[ currBrick.currPosX[ i ] ][ currBrick.currPosY[ i ] ] = currBrick.type;
    }
}
function checkLineFull() {

    var lineIsFull = true;
    var fullLines = 0;
    
    for( var y = 0 ; y < numOfY ; y++ ) {
            
        for( var x = 0 ; x < numOfX ; x++ ) {
                
            if( cells[ x ][ y ] === -1 ) {
                
                lineIsFull = false;
                continue;
            }
        }

        if( lineIsFull ) {
    
            
            // 한 줄이 꽉찼다. 이 줄을 지우고, 이 줄보다 위에 있는 블럭들을 전부 한줄씩 내린다. 점수 올린다.
            
            for( var j = y ; j > 0 ; j-- ) {
                
                for( var i = 0 ; i < numOfX ; i++ ) {
                    
                    cells[ i ][ j ] = cells[ i ][ j - 1 ];
                }
            }
            
            score += 100;
            fullLines++;
        }
                
        lineIsFull = true;
    }
    
    // if more than 2 lines are removed, opponent's stacked lines will be increased by removed lines - 1.
    // Ex) I removed 3 lines, opponent gets 2 lines.
    // Ex) I removed 2 lines, opponent gets 1 lines.
    if( fullLines > 1 )
        attack( fullLines );
    
}
function attack( lines ) {
    //
    var packet = {
        sender : myName,
        receiver : '',
        type1 : 'game',
        type2 : 'tetris',
        command : 'attack'
    };
    packet.lines = lines;

    socket.emit('game:tetris', packet);
    console.log( 'attack ' + lines);
}
function generateNextBricks() {
	
    currBrick = new TetrisBrick( nextBricksType[ 0 ] );
    generateNextBricksType();
}
function checkGameOver() {
            
    //    if( !gameRunning )
    //        return;
 
    for( var i = 0 ; i < 4 ; i++ ) {
        for( var j = 0 ; j < numOfX ; j++) {
            if( cells[ j ][ i ] >= 0 ) {

                // game over
    console.log( "GameOver");            
                gameOver = true;
                
                gameRunning = false;
                timerRunning = false;
                won	= false;

                try {

                    // I lost
                    // send lost packet

                    clearInterval( gameTimer );
                }
                catch( Exception ) {

                    //

                }

                var packet = {
                    sender : myName,
                    receiver : '',
                    type1 : 'game',
                    type2 : 'tetris',
                    command : 'lost'
                };
            
                socket.emit('game:tetris', packet);

                break;
            }
        }
    }


    
}
function sendCells() {
		
    var packet = {
        sender : myName,
        receiver : '',
        type1 : 'game',
        type2 : 'tetris',
        command : 'cells'
    };
    packet.cells = cells;
    
    socket.emit('game:tetris', packet);
}
function countGame() {
 
    if( ++gameCnt % 1000000 === 0 )
        gameCnt = 0;

    // if a brick can move down, Move a brick down
    if( checkMovable( "Down" ) ) {
			
        currBrick.moveDown();
    }
    else {									// 내려올 수 있을만큼 내려왔다. 다음 블럭 만들어서 내려보내기
        
        pinCurrBrickToCells();
        checkLineFull();
        generateNextBricks();
        checkGameOver();
    }

    sendCells();


    drawAll();
}
function initCells() {

    cells = new Array();
    opponentCells = new Array();

    for( var x = 0 ; x < numOfX ; x++ ) {
            
        cells[ x ] = new Array();
        opponentCells[ x ] = new Array();

        for( var y = 0 ; y < numOfY ; y++ ) {
        
            cells[ x ][ y ] = -1;
            opponentCells[ x ][ y ] = -1;       
        }
    }
}
function gameInit() {
        
    canvas = document.getElementById( "tetris" ); 
    ctx = canvas.getContext( "2d" ); 
    loadImages();

    // initializes cells (10 x 20)
    initCells();
    nextBricksType = [-1,-1,-1];


    // generates next bricks
    //		nextBricksType[ 0 ] = -1;
    generateNextBricksType();
    
    // generates a running brick
    currBrickType = nextBricksType[ 0 ];
    
    currBrick = new TetrisBrick( currBrickType );

    generateNextBricksType();
    
    level = 0;
    score = 0;
    stage = 1;
    intervalDown = 2000;

    gameTimerSpeed = 1000;
    gameCnt = 0;


    

    var watchingStart = setInterval( function(){

        if( startBattle === true ) {
            gameTimer = setInterval( countGame, gameTimerSpeed );
            clearInterval(watchingStart);         
        }
        else {
            drawPanel();
            drawMessage( "WAITING" );
        }
    }, 1000);



 




    gameOver = false;

}	
function generateNextBricksType() {
		
    // brick types 0 ~ 6   <-  appearance ratio = 21/26
    // brick types 7 ~ 11  <-  appearance ratio =  5/26
    
    var next = [[ 0, 1, 2, 3, 4, 5, 6 ], 	// Low
                [ 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 8, 9, 10, 11 ],	// Medium
                [ 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10, 11 ] ];	// High

    //Math.floor( Math.random() * 10 )   <--- 0 ~ 9
    if( nextBricksType[ 0 ] === -1 ) {
        
        //nextBricksType[ 0 ] = next[ level ][ random.nextInt( next[ level ].length ) ];
        //nextBricksType[ 1 ] = next[ level ][ random.nextInt( next[ level ].length ) ];

        nextBricksType[ 0 ] = next[ level ][ Math.floor(  Math.random() * next[ level ].length ) ];
        nextBricksType[ 1 ] = next[ level ][ Math.floor(  Math.random() * next[ level ].length ) ];
    }
    else {
        
        nextBricksType[ 0 ] = nextBricksType[ 1 ];
        nextBricksType[ 1 ] = nextBricksType[ 2 ];
    }
        
    nextBricksType[ 2 ] = next[ level ][ Math.floor(  Math.random() * next[ level ].length ) ];
   
}


function loadImages() {

    imgBrick[ 0 ] = document.getElementById( "Brick0" );
    imgBrick[ 1 ] = document.getElementById( "Brick1" );
    imgBrick[ 2 ] = document.getElementById( "Brick2" );
    imgBrick[ 3 ] = document.getElementById( "Brick3" );
    imgBrick[ 4 ] = document.getElementById( "Brick4" );
    imgBrick[ 5 ] = document.getElementById( "Brick5" );
    imgBrick[ 6 ] = document.getElementById( "Brick6" );
    imgBrick[ 7 ] = document.getElementById( "Brick7" );
    imgBrick[ 8 ] = document.getElementById( "Brick8" );
    imgBrick[ 9 ] = document.getElementById( "Brick9" );
    imgBrick[ 10 ] = document.getElementById( "Brick10" );
    imgBrick[ 11 ] = document.getElementById( "Brick11" );
    imgBrick[ 12 ] = document.getElementById( "Brick12" );
}

class TetrisBrick {
    
    constructor( type ) {

        this.type = type;
        this.rotate = 0;
        this.color = brickColors[ type ];	
        this.currPosX = new Array();
        this.currPosY = new Array();
            
        for( var i = 0 ; i < 4 ; i++ ) {

            this.currPosX[ i ] = squarePosX[ type ][ 0 ][ i ];
            this.currPosY[ i ] = squarePosY[ type ][ 0 ][ i ];
            
            if( type === 1 || type === 4 || type === 5 ) this.currPosY[ i ] += 1;
            if( type === 2 || type === 3 || type === 6 ) this.currPosY[ i ] += 2;
        } 
    }

    moveToLeft() {

        for( var i = 0 ; i < 4 ; i++ )
            --this.currPosX[ i ];
    }


    moveToRight() {

        for( var i = 0 ; i < 4 ; i++ )
            ++this.currPosX[ i ];
    }


    moveDown() {

        for( var i = 0 ; i < 4 ; i++ )	
            ++this.currPosY[ i ];
    }

    moveUp() {

        for( var i = 0 ; i < 4 ; i++ )	
            --this.currPosY[ i ];
    }

    rotateBrick() {

        if( this.type === 6 )		// 6번 타입 네모 블럭은 회전해도 동일한 모양
            return;


        // 가장 좌측, 가장 우측, 가장 하단이면 회전이 안됨

        // 0 -> 1 -> 2 -> 3 -> 4 -> 1 -> 2 -> 3 -> 4 -> 1 -> ...
        this.rotate = ( ++this.rotate ) % 4;

        if( this.rotate === 0 )
                this.rotate += 4;


        // 회전 후 블럭이 밖으로 나가면 안된다
        for( var i = 0 ; i < 4 ; i++ ) {

            if( this.currPosX[ i ] + squarePosX[ this.type ][ this.rotate ][ i ] > numOfX - 1 || 
                this.currPosX[ i ] + squarePosX[ this.type ][ this.rotate ][ i ] < 0 ||
                this.currPosY[ i ] + squarePosY[ this.type ][ this.rotate ][ i ]	> numOfY - 1 ) {

                if( --this.rotate === 0 )
                    this.rotate = 4;

                return;
            }
        }


        for( var i = 0 ; i < notRotatableX[ this.type ][ this.rotate - 1 ].length ; i++ ) {

            var x = this.currPosX[ 0 ] + notRotatableX[ this.type ][ this.rotate - 1 ][ i ];
            var y = this.currPosY[ 0 ] + notRotatableY[ this.type ][ this.rotate - 1 ][ i ];

            if( cells[ x ][ y ] >= 0 ) {

                if( --this.rotate === 0 )
                    this.rotate = 4;

                return;
            }
        }

        for( var i = 0 ; i < 4 ; i++ ) {

            this.currPosX[ i ] += squarePosX[ this.type ][ this.rotate ][ i ];
            this.currPosY[ i ] += squarePosY[ this.type ][ this.rotate ][ i ];			
        }

    }
}
