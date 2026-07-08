migrate(
  (app) => {
    // Step 1: Remove `email` field from patients if it exists (defensive — schema should already be clean)
    var patientsCol = app.findCollectionByNameOrId('patients')
    var emailField = patientsCol.fields.getByName('email')
    if (emailField) {
      try {
        patientsCol.fields.removeById(emailField.id)
      } catch (_) {
        patientsCol.fields.remove(emailField)
      }
      app.save(patientsCol)
    }

    // Step 2: Purge all data for aquinobr@hotmail.com
    var targetUserId = null
    try {
      var userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'aquinobr@hotmail.com')
      targetUserId = userRecord.id
    } catch (_) {
      // User doesn't exist — nothing to purge
    }

    if (targetUserId) {
      // Find all patient records for this user
      var patientIds = []
      try {
        var patientRecords = app.findRecordsByFilter('patients', 'user_id = {:uid}', '', 0, 0, {
          uid: targetUserId,
        })
        for (var i = 0; i < patientRecords.length; i++) {
          patientIds.push(patientRecords[i].id)
        }
      } catch (_) {}

      // Delete meals and related data for each patient
      for (var p = 0; p < patientIds.length; p++) {
        var pid = patientIds[p]

        // Delete meal_photos for meals of this patient
        try {
          var meals = app.findRecordsByFilter('meals', 'patient_id = {:pid}', '', 0, 0, {
            pid: pid,
          })
          for (var m = 0; m < meals.length; m++) {
            try {
              var photos = app.findRecordsByFilter('meal_photos', 'meal_id = {:mid}', '', 0, 0, {
                mid: meals[m].id,
              })
              for (var ph = 0; ph < photos.length; ph++) {
                app.delete(photos[ph])
              }
            } catch (_) {}
            // Delete meal_edit_logs for this meal
            try {
              var editLogs = app.findRecordsByFilter(
                'meal_edit_logs',
                'meal_id = {:mid}',
                '',
                0,
                0,
                { mid: meals[m].id },
              )
              for (var el = 0; el < editLogs.length; el++) {
                app.delete(editLogs[el])
              }
            } catch (_) {}
            app.delete(meals[m])
          }
        } catch (_) {}

        // Delete alerts for this patient
        try {
          var alerts = app.findRecordsByFilter('alerts', 'patient_id = {:pid}', '', 0, 0, {
            pid: pid,
          })
          for (var a = 0; a < alerts.length; a++) {
            app.delete(alerts[a])
          }
        } catch (_) {}

        // Delete calorie_logs for this patient
        try {
          var calLogs = app.findRecordsByFilter('calorie_logs', 'patient_id = {:pid}', '', 0, 0, {
            pid: pid,
          })
          for (var c = 0; c < calLogs.length; c++) {
            app.delete(calLogs[c])
          }
        } catch (_) {}

        // Delete macro_logs for this patient
        try {
          var macroLogs = app.findRecordsByFilter('macro_logs', 'patient_id = {:pid}', '', 0, 0, {
            pid: pid,
          })
          for (var ml = 0; ml < macroLogs.length; ml++) {
            app.delete(macroLogs[ml])
          }
        } catch (_) {}

        // Delete professional_notes for this patient
        try {
          var notes = app.findRecordsByFilter(
            'professional_notes',
            'patient_id = {:pid}',
            '',
            0,
            0,
            { pid: pid },
          )
          for (var n = 0; n < notes.length; n++) {
            app.delete(notes[n])
          }
        } catch (_) {}

        // Delete reports for this patient
        try {
          var reports = app.findRecordsByFilter('reports', 'patient_id = {:pid}', '', 0, 0, {
            pid: pid,
          })
          for (var r = 0; r < reports.length; r++) {
            app.delete(reports[r])
          }
        } catch (_) {}

        // Delete access_logs targeting this patient
        try {
          var accessLogs = app.findRecordsByFilter(
            'access_logs',
            'target_patient_id = {:pid}',
            '',
            0,
            0,
            { pid: pid },
          )
          for (var al = 0; al < accessLogs.length; al++) {
            app.delete(accessLogs[al])
          }
        } catch (_) {}
      }

      // Delete access_logs by this user
      try {
        var userAccessLogs = app.findRecordsByFilter('access_logs', 'user_id = {:uid}', '', 0, 0, {
          uid: targetUserId,
        })
        for (var ua = 0; ua < userAccessLogs.length; ua++) {
          app.delete(userAccessLogs[ua])
        }
      } catch (_) {}

      // Delete chatgpt_analysis_logs by this user
      try {
        var aiLogs = app.findRecordsByFilter(
          'chatgpt_analysis_logs',
          'user_id = {:uid}',
          '',
          0,
          0,
          { uid: targetUserId },
        )
        for (var ai = 0; ai < aiLogs.length; ai++) {
          app.delete(aiLogs[ai])
        }
      } catch (_) {}

      // Finally delete the user (cascade will remove patient records via user_id relation)
      try {
        app.delete(userRecord)
      } catch (_) {}
    }
  },
  (app) => {
    // No-op: purged data cannot be restored
  },
)
