const querystring = require(`querystring`)

module.exports = async (client, { endpoint, ...options }, reporter) => {
    const defaultHandle = async function (client, endpoint, { params }) {
        try {
            const results = await client.get(endpoint, params)
            return results.length ? results : [results]
        } catch (e) {
            reporter.error(`Error from "${endpoint}" - ${e.message}`)
            console.error(e)
        }
        return []
    }

    const userTimeline = async function (client, endpoint, { params }) {
        try {
            console.log(params)
            const results = await client.v1.userTimelineByUsername(
                params.screen_name
            )
            return results && results.tweets && results.tweets.length
                ? results.tweets
                : []
        } catch (e) {
            reporter.error(`Error from "${endpoint}" - ${e.message}`)
            console.error(e)
        }
        return []
    }

    const favoriteTimeline = async function (client, endpoint, { params }) {
        try {
            const results = await client.v1.favoriteTimelineByUsername(
                params.screen_name
            )
            return results && results.tweets && results.tweets.length
                ? results.tweets
                : []
        } catch (e) {
            reporter.error(`Error from "${endpoint}" - ${e.message}`)
            console.error(e)
        }
        return []
    }

    const usersHandle = async function (client, endpoint, { params }) {
        try {
            const results = await client.v1.searchUsers(params.q)
            return results && results.users && results.users.length
                ? results.users
                : []
        } catch (e) {
            reporter.error(`Error from "${endpoint}" - ${e.message}`)
            console.error(e)
        }
        return []
    }

    const searchHandle = async function (
        client,
        endpoint,
        { fetchAllResults = false, params }
    ) {
        const results = []
        let queryParams = { ...params }
        let fetchNextResults = true
        console.log(params)

        while (fetchNextResults) {
            let lastResults
            try {
                lastResults = await client.v2.searchAll(params.q)
            } catch (e) {
                reporter.error(`Fetch error ${endpoint}: ${e.message}`)
            }

            if (lastResults && lastResults.tweets) {
                results.push(...lastResults.tweets)
            }

            if (
                fetchAllResults === true &&
                lastResults &&
                lastResults.search_metadata &&
                lastResults.search_metadata.next_results
            ) {
                queryParams = {
                    ...querystring.parse(
                        lastResults.search_metadata.next_results.substr(1)
                    ),
                    ...params,
                }
            } else {
                fetchNextResults = false
            }
        }

        return results
    }

    const handles = {
        //"favorites/list": defaultHandle,
        //"statuses/show": defaultHandle,
        //"statuses/lookup": defaultHandle,
        //"statuses/oembed": defaultHandle,
        "statuses/favorite_timeline": favoriteTimeline,
        "statuses/user_timeline": userTimeline,
        //"lists/statuses": defaultHandle,
        //"lists/members": usersHandle,
        "search/tweets": searchHandle,
        default: (client, endpoint) => {
            reporter.warn(`${endpoint} endpoint is not supported`)
            return []
        },
    }

    // based on the endpoint text, return the correct handler function
    const getHandle = (endpoint) => handles[endpoint] || handles.default

    reporter.info(`Fetching Twitter ${endpoint} content...`)

    const handle = getHandle(endpoint)

    // call the handler function and return the results
    const results = await handle(client, endpoint, options)

    return results
}
