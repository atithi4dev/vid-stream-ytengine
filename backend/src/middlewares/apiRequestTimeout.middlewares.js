export const requestTimeout = (ms = 30_000) => {
    return (req, res, next) => {
        // res setTimeout will automatically end the response if it takes longer than the specified time
        res.setTimeout(ms, () => {
            res.status(408).json({ error: 'Request timed out' });
        });
        next();
    }
}