window.navigator.userAgent = 'react-native'

var Reflux = require('reflux')
var SmokeActions = require('../Actions/SmokeActions')
var UserStore = require('./UserStore')
var _ = require('lodash')
var socket = require('../socket')
var SmokeStore = Reflux.createStore({

  smokeSignals: {smokeSignals: {}, forMe: [], forAll: []},
  
  init: function() {

    socket.emit('joinUser', {nick: UserStore.getUserData().nick})
    
    socket.on('u-smokesignal.action.done', function(result) {

      this.updatessAction(result.params, result.message)

    }.bind(this))

    socket.on('u-smokesignal.commentAction.done', function(result){

      this.updateCommentAction(result.params, result.message)

    }.bind(this))

    socket.on('u-smokesignal.done', function(result) {

      this.updateSmokeSignal(result)

    }.bind(this))

    socket.on('r-user.interest-matches.done', function(res) {

      this.smokeSignals.forMe = res.results.map(function(signal) {
        return signal._id
      })

      this.trigger()
    }.bind(this)) 

    socket.on('r-smokesignal.forall.done', function(smokesignals) {

      this.smokeSignals.forAll = smokesignals.message.map(function(signal) {
        return signal._id
      })

      this.smokeSignals.smokeSignals = smokesignals.message.reduce(function(result, smokesignal) {
        result[smokesignal._id] = smokesignal
        return result
      },{})

      this.trigger()

    }.bind(this))

    socket.on('c-smokesignal.done', function(smokesignal) { 

      this.smokeSignals.smokeSignals[smokeSignal._id] = smokesignal.result
      this.trigger()

    }.bind(this))


    this.listenTo(SmokeActions.addSmokeSignal, this.addSmokeSignal)
    this.listenTo(SmokeActions.smokeSignal_Thanks, this.smokeSignal_Thanks)
    this.listenTo(SmokeActions.smokeSignal_NoThanks, this.smokeSignal_NoThanks)
    this.listenTo(SmokeActions.smokeSignal_PutOff, this.smokeSignal_PutOff)
    this.listenTo(SmokeActions.smokeSignal_Restart, this.smokeSignal_Restart)

  },

  //get all smokeSignals
  getSmokeSignals: function() {
    return [this.smokeSignals.forAll, this.smokeSignals.forMe]
  },

  request: function() {
    socket.emit('r-smokesignal.forall', {match_all: {}})
    return [this.smokeSignals.forAll, this.smokeSignals.forMe]
  },

  getInterestsMatches: function() {
    var userData = UserStore.getUserData()
    socket.emit('r-user.interest-matches', {userId: userData.nick, size: 20, from: 0}) 
    return this.smokeSignals.forMe
  },

  updateSmokeSignal: function(smokeSignal) {
    var ss = _.find(this.smokeSignals.smokeSignals, {_id: smokeSignal._id}) 
    if(!ss) {
      return
    }
    else if (smokeSignal.comment) {
      ss._source.comments.push(smokeSignal.comment)
      this.trigger({message: smokeSignal.message})
    }
    else {
      _.merge(ss, smokeSignal)
    }
    this.trigger()
  },
  
  updateCommentAction: function(params, message) {
    var ss = _.find(this.smokeSignals.smokeSignals, {_id: params._id})
    var comment = _.find(ss._source.comments, {commentId: params.commentId})
    if(!comment) {
      return
    }
    comment[params.action] += 1
    this.trigger({message: message})
  },
  
  updatessAction: function(params, message) {
    var ss = _.find(this.smokeSignals.smokeSignals, {_id: params._id})

    if(!ss) {
      return
    }
    ss._source[params.action] += 1
    
    this.trigger({message: message})
  },

  //get Smoke with id
  getSmokeSignal: function(smokeId) {
    var smokeSignal =  _.find(this.smokeSignals.smokeSignals, {'_id': smokeId})
    
    return smokeSignal
  },

  addSmokeSignal: function(smokeSignal) {

    socket.emit('c-smokesignal', smokeSignal)

  },
})

module.exports = SmokeStore

