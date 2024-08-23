const express = require("express");
const mongoose = require("mongoose");
const Student = mongoose.model("Student");
const Coach = mongoose.model("Coach");
const Team = mongoose.model("Team");
const passport = require("passport");
const wrapAsync = require("../utils/wrapAsync");
const { isStudent } = require("../middlewares");
const multer = require("multer");
const { storage } = require("../cloudinary");
const upload = multer({ storage });
const { uploader } = require("cloudinary").v2;
const router = express();

// Defining routes
router.get(
  "/student/register/:teamId",
  wrapAsync(async (req, res) => {
    const dop = ["6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U"];

    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate({
      path: "coaches",
      match: { status: "approved" },
    });
    res.render("./student/register", { team, dop });
  })
);

router.post(
  "/student/register/:teamId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "captureImage", maxCount: 1 },
    { name: "document", maxCount: 6 },
  ]),
  wrapAsync(async (req, res, next) => {
    const {
      username,
      password,
      dop,
      dobYear,
      dobMonth,
      dobDate,
      documents,
      role,
      fullname,
      parent,
      phone,
      address,
      coach,
    } = req.body;
    dob = `${dobMonth}-${dobDate}-${dobYear}`;
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    const foundStudent = await Student.find({ username });
    const dateOfBirth = new Date(dob);

    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const m = today.getMonth() - dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    if (foundStudent.length) {
      req.flash(
        "error",
        "It looks like a student with this email is already registered."
      );
      return res.redirect(`/student/register/${teamId}`);
    }

    const student = new Student({
      team: teamId,
      role,
      association: team.name,
      username,
      dop,
      fullname,
      age,
      dob,
      parent,
      phone,
      address,
      registrationMode: "single",
    });

    if (coach) {
      student.coach = coach;
    }

    if (req.files["image"]) {
      const { filename, path } = req.files["image"][0];
      student.image.filename = filename;
      student.image.path = path;
    }

    if (req.files["captureImage"]) {
      const { filename, path } = req.files["captureImage"][0];
      student.image.filename = filename;
      student.image.path = path;
    }

    if (req.files["document"]) {
      const docs = req.files["document"];
      docs.forEach((document, i) => {
        const { filename, path } = document;
        student.documents.push({
          filename,
          path,
          documentName: Array.isArray(documents) ? documents[i] : documents,
        });
      });
    }

    await Team.findByIdAndUpdate(
      teamId,
      {
        $addToSet: { students: student._id },
      },
      { new: true }
    );

    await Student.register(student, password, (err, newStudent) => {
      if (err) {
        next(err);
      }
      req.logIn(newStudent, async () => {
        res.redirect(`/invoice/${newStudent._id}`);
      });
    });
  })
);

router.get(
  "/student/login",
  wrapAsync(async (req, res) => {
    res.render("./student/login");
  })
);

router.post("/student/login", (req, res, next) => {
  passport.authenticate("student", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      req.flash("error", "Invalid Email or Password");
      return res.redirect("/student/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      if (user instanceof Student) {
        if (user.paymentStatus === "unpaid") {
          return res.redirect(`/invoice/${user._id}`);
        }
        req.flash("success", `Welcome back ${user.fullname}!`);
        return res.redirect(`/student/${user._id}/${user.team._id}`);
      }
    });
  })(req, res, next);
});

router.get(
  "/student/:id/:teamId",
  isStudent,
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate("students");
    const student = await Student.findById(id).populate("coach");
    res.render("./student/student", { student, team });
  })
);

router.get(
  "/invoice/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const student = await Student.findById(id)
      .populate("team")
      .populate("coach");
    res.render("./student/invoice", { student });
  })
);

router.get(
  "/s/:id/edit",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const dop = ["6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U"];
    const student = await Student.findById(id).populate("coach");
    const team = await Team.findById(student.team).populate({
      path: "coaches",
      match: { status: "approved" },
    });
    const dob = student.dob.split("-");
    const year = dob[0];
    const month = dob[1];
    const date = dob[2];
    res.render("./student/editinfo", { student, team, dop, year, month, date });
  })
);

router.get(
  "/profile/:id/edit",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const student = await Student.findById(id).populate("coach");
    const docName = [
      "State ID",
      "Passport",
      "School ID",
      "SSN",
      "Birth Certificate",
      "Parent ID",
    ];
    res.render("./student/profile", { student, docName });
  })
);

router.put(
  "/profile/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const student = await Student.findByIdAndUpdate(id, { ...req.body });
    req.logIn(student, function (err) {
      if (err) {
        return next(err);
      }
      req.flash("success", "Information has been updated successfully.");
      res.redirect(`/profile/${id}/edit`);
    });
  })
);

router.put(
  "/student/register/:teamId/:studentId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "captureImage", maxCount: 1 },
    { name: "document", maxCount: 6 },
  ]),
  wrapAsync(async (req, res) => {
    const {
      role,
      association,
      username,
      dop,
      fullname,
      jersey,
      age,
      dob,
      parent,
      phone,
      address,
      coach,
    } = req.body;
    const { teamId, studentId } = req.params;

    const student = await Student.findById(studentId);

    if (!student) {
      req.flash("error", "Student not found.");
      return res.redirect(`/s/${studentId}/edit`);
    }

    await Team.findByIdAndUpdate(student.team, {
      $pull: { students: studentId },
    });

    await Coach.findByIdAndUpdate(student.coach, {
      $pull: { students: studentId },
    });

    if (coach === "none") {
      req.flash("error", "You cannot register without selecting a coach.");
      if (req.files["image"]) {
        await uploader.destroy(req.files["image"][0].filename);
      }
      if (req.files["captureImage"]) {
        await uploader.destroy(req.files["captureImage"][0].filename);
      }
      if (req.files["document"]) {
        req.files["document"].forEach(async (document) => {
          await uploader.destroy(document.filename);
        });
      }
      return res.redirect(`/s/${studentId}/edit`);
    }

    const foundJersey = await Student.findOne({
      team: teamId,
      dop,
      jersey,
    });

    if (foundJersey) {
      req.flash(
        "error",
        "This jersey number is already assigned to another student in the team. Please choose a different one."
      );
      if (req.files["image"]) {
        await uploader.destroy(req.files["image"][0].filename);
      }
      if (req.files["captureImage"]) {
        await uploader.destroy(req.files["captureImage"][0].filename);
      }
      if (req.files["document"]) {
        req.files["document"].forEach(async (document) => {
          await uploader.destroy(document.filename);
        });
      }
      return res.redirect(`/s/${studentId}/edit`);
    }

    if (req.files["image"]) {
      // Delete the existing image if it exists
      if (student.image && student.image.filename) {
        await uploader.destroy(student.image.filename);
      }
      const { filename, path } = req.files["image"][0];
      student.image.filename = filename;
      student.image.path = path;
    }

    if (req.files["captureImage"]) {
      // Delete the existing captureImage if it exists
      if (student.captureImage && student.captureImage.filename) {
        await uploader.destroy(student.captureImage.filename);
      }
      const { filename, path } = req.files["captureImage"][0];
      student.captureImage.filename = filename;
      student.captureImage.path = path;
    }

    if (req.files["document"]) {
      // Delete existing documents if they exist
      if (student.documents.length > 0) {
        student.documents.forEach(async (doc) => {
          await uploader.destroy(doc.filename);
        });
      }
      // Add new documents
      req.files["document"].forEach((document, i) => {
        const { filename, path } = document;
        student.documents.push({
          filename,
          path,
          documentName: req.body.documents[i],
        });
      });
    }

    student.username = username;
    student.dop = dop;
    student.jersey = jersey;
    student.team = teamId;
    student.coach = coach;
    student.role = role;
    student.association = association;
    student.fullname = fullname;
    student.age = age;
    student.dob = dob;
    student.parent = parent;
    student.phone = phone;
    student.address = address;
    student.coach = coach;

    await student.save();

    await Team.findByIdAndUpdate(teamId, {
      $addToSet: { students: studentId },
    });

    await Coach.findByIdAndUpdate(coach, {
      $addToSet: { students: studentId },
    });

    req.flash("success", "Your information has been updated!");
    res.redirect(`/invoice/${studentId}`);
  })
);

router.get("/check-username/:username", async (req, res) => {
  const { username } = req.params;
  const exists = await Student.findOne({ username });
  res.json({ exists });
});

router.put("/:studentId/documents", upload.single("file"), async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const documentName = req.body.documentName;
    const file = req.file;

    // Find the student by ID
    const student = await Student.findById(studentId);

    // Find the document with the matching documentName
    const document = student.documents.find(
      (doc) => doc.documentName === documentName
    );

    // Delete the old image from Cloudinary if the document exists
    if (document && document.filename) {
      await uploader.destroy(document.filename);
    }

    // Upload the file to Cloudinary
    const result = await uploader.upload(file.path);

    let updatedStudent;
    if (document) {
      // If document exists, update its filename and path
      updatedStudent = await Student.findOneAndUpdate(
        { _id: studentId, "documents.documentName": documentName },
        {
          $set: {
            "documents.$.filename": result.public_id,
            "documents.$.path": result.secure_url,
          },
        },
        { new: true }
      );
    } else {
      // If document doesn't exist, add a new document to the array
      updatedStudent = await Student.findOneAndUpdate(
        { _id: studentId },
        {
          $push: {
            documents: {
              documentName: documentName,
              filename: result.public_id,
              path: result.secure_url,
            },
          },
        },
        { new: true }
      );
    }
    res.json({
      message: "Document updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update document" });
  }
});

router.put("/:studentId/image", upload.single("file"), async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const file = req.file;

    // Find the student by ID
    const student = await Student.findById(studentId);

    // Delete the old image from Cloudinary if it exists
    if (student.image && student.image.filename) {
      await uploader.destroy(student.image.filename);
    }

    // Upload the new image to Cloudinary
    const result = await uploader.upload(file.path);

    // Update the student's profile image
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      {
        $set: {
          image: { filename: result.public_id, path: result.secure_url },
        },
      },
      { new: true }
    );

    res.json({
      message: "Profile image updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update profile image" });
  }
});

// Managing Zelle Payment
router.post(
  "/zelle/paid",
  wrapAsync(async (req, res, next) => {
    const { _id } = req.user;
    const { paymentNumber } = req.body;

    if (!paymentNumber) {
      req.flash(
        "error",
        "Please enter the invoice number as evidence if you paid through Zelle."
      );
      return res.redirect(`/invoice/${_id}`);
    }
    await Student.findByIdAndUpdate(_id, {
      paymentMethod: "zelle",
      paymentStatus: "review",
      paymentNumber,
    });
    req.flash("success", "Your application is under review.");
    return res.redirect(`/invoice/${_id}`);
  })
);

router.post(
  "/cash/paid",
  wrapAsync(async (req, res, next) => {
    const { _id } = req.user;
    await Student.findByIdAndUpdate(_id, {
      paymentMethod: "cash",
      paymentStatus: "cash",
    });
    req.flash(
      "success",
      "Please submit the cash payment to any of the administrator."
    );
    res.redirect(`/invoice/${_id}`);
  })
);

module.exports = router;
