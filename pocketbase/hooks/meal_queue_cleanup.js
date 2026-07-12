cronAdd('meal_queue_cleanup', '0 3 * * *', () => {
  var cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  try {
    $app
      .db()
      .newQuery(
        "DELETE FROM meal_analysis_queue WHERE status = 'completed' AND finished_at != '' AND finished_at < {:cutoff}",
      )
      .bind({ cutoff: cutoff })
      .execute()
  } catch (err) {
    $app.logger().error('meal_queue_cleanup failed', 'error', err.message)
  }
})
