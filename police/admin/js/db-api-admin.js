DBApi.headers({ 'x-apikey': '58da976b9b7aa194660910e5', 'Content-Type': 'application/json', 'Accept': 'application/json' })
DBApi.getUnapprovedComments = function(success) {
    return DBApi.call({ url: 'police-comments?q={"accepted": {"$exists": false}}' }, success)
}
DBApi.acceptComment = function(commentId, accepted, success) {
    var patch = { updated: +new Date(), accepted: accepted }
    return DBApi.call({ method: 'PATCH', data: patch, url: 'police-comments/' + commentId }, success)
}

DBApi.getCommentsByTargetId = function(targetId, success) {
    var q = '{"target" : "{0}"}';
    return DBApi.call({ url: 'police-comments?q=' + q.format(targetId) }, success)
}

DBApi.deleteComment = function(comment) {
    return DBApi.call({ method: 'DELETE', url: 'police-comments/' + comment._id })
}
