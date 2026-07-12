onRecordAfterCreateSuccess((e) => {
  var meal = e.record
  var status = meal.getString('analysis_status')
  if (!status) {
    meal.set('analysis_status', 'pending')
    $app.save(meal)
  }
  return e.next()
}, 'meals')
