//=========================================================
// Import modules
//=========================================================

var builder = require('botbuilder');
var fs = require('fs');
var path = require('path');
var Defs = require('./defs');
var Strings = require('./strings');
var Game = require('./game');

//=========================================================
// Main
//=========================================================

function main(session)
{
    Game.updateUserData(session);

    builder.Prompts.choice(session, "", [Strings.Menu.NEW_GAME, Strings.Menu.STATISTICS, Strings.Menu.LEADERBOARD].join("|"), 
    { 
        listStyle: builder.ListStyle['button']
    });
}

function newGame(session)
{
    if (session.userData.playerInfo && session.userData.playerInfo.funds < Defs.Board.ROUND_BUYINS)
    {
        builder.Prompts.choice(session, Strings.RESET_GAME, [Strings.YES, Strings.NO].join("|"), 
        { 
            listStyle: builder.ListStyle['button']
        });
    }
    else
    {
        // Launch game
        Game.init(session);        
        session.beginDialog(Strings.Dialog.GAME);
    }    
}

function statistics(session)
{
    var winLoseCount = session.userData.playerInfo.win + session.userData.playerInfo.lose;
    var totalActions = session.userData.playerInfo.fold + session.userData.playerInfo.check + session.userData.playerInfo.call + session.userData.playerInfo.bet + session.userData.playerInfo.raise + session.userData.playerInfo.reraise;
    var winRate = (winLoseCount === 0) ? 0 : ((session.userData.playerInfo.win * 100) / winLoseCount).toPrecision(2);
    var foldRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.fold * 100) / totalActions).toPrecision(2);
    var checkRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.check * 100) / totalActions).toPrecision(2);
    var callRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.call * 100) / totalActions).toPrecision(2);
    var betRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.bet * 100) / totalActions).toPrecision(2);
    var raiseRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.raise * 100) / totalActions).toPrecision(2);
    var reraiseRate = (totalActions === 0) ? 0 : ((session.userData.playerInfo.reraise * 100) / totalActions).toPrecision(2);

    session.send(session.userData.playerInfo.name + 
                 Strings.Statistics.FUNDS + session.userData.playerInfo.funds + 
                 Strings.Statistics.WIN + winRate + "%" + 
                 Strings.Statistics.FOLD + foldRate + "%" + 
                 Strings.Statistics.CHECK + checkRate + "%" + 
                 Strings.Statistics.CALL + callRate + "%" + 
                 Strings.Statistics.BET + betRate + "%" + 
                 Strings.Statistics.RAISE + raiseRate + "%" + 
                 Strings.Statistics.RERAISE + reraiseRate + "%");
                    
    session.replaceDialog(Strings.Dialog.MENU);
}

function leaderBoard(session)
{
    if (Defs.USE_LEADERBOARD_CACHE)
    {
        var leaderboard = [];
        for (var i in Game.LEADERBOARD_CACHE)
        {
            leaderboard.push(Game.LEADERBOARD_CACHE[i]);
        }

        leaderboard.sort
        (
            function(userInfo1, userInfo2)
            {
                return userInfo2.funds - userInfo1.funds;
            }
        );

        // Display top players
        var leaderBoardMessage = "";
        var max = Math.min(leaderboard.length, Defs.LEADERBOARD_LIMIT);
        for (var i = 0; i < max; i++)
        {
            leaderBoardMessage += (i + 1) + ". " + leaderboard[i].name + " ($" + leaderboard[i].funds + ")" + "\n";
        }

        session.send(leaderBoardMessage);
        session.replaceDialog(Strings.Dialog.MENU);   
    }
    else
    {
        var usersRootDir = Defs.Path.USERS_DIR;
        var usersInfo = []; 
        fs.readdir(usersRootDir, function(err, files) 
        { 
            var usersDirs = [];
            for (var i = 0; i < files.length; i++) 
            { 
                if (files[i][0] !== '.')
                {
                    usersDirs.push(files[i]);
                }
            }

            var completedCount = 0;
            for (var i = 0; i < usersDirs.length; i++) 
            {
                fs.readFile(path.join(usersRootDir, usersDirs[i], Defs.Path.PLAYER_INFO_FILE), 'utf8', function (err, data) 
                {
                    completedCount++;
                    if (!err)
                    {
                        usersInfo.push(JSON.parse(data));
                    }

                    // All users info have been loaded
                    if (completedCount == usersDirs.length)
                    {
                        usersInfo.sort
                        (
                            function(userInfo1, userInfo2)
                            {
                                return userInfo2.funds - userInfo1.funds;
                            }
                        );

                        // Display top players
                        var leaderBoardMessage = "";
                        var max = Math.min(usersInfo.length, Defs.LEADERBOARD_LIMIT);
                        for (var i = 0; i < max; i++)
                        {
                            leaderBoardMessage += (i + 1) + ". " + usersInfo[i].name + " ($" + usersInfo[i].funds + ")" + "\n";
                        }

                        session.send(leaderBoardMessage);
                        session.replaceDialog(Strings.Dialog.MENU);
                    }
                });
            }
        });    
    }
}

//=========================================================
// Export
//=========================================================

exports.main = main;
exports.newGame = newGame;
exports.statistics = statistics;
exports.leaderBoard = leaderBoard;