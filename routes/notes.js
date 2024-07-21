const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Notes = require("../models/Notes");
const fetchuser = require("../middleware/fetchuser");

//ROUTE-1: get user all Notes Get   "/api/auth/fetchallnote". login require
router.get("/fetchallnote", fetchuser, async (req, res) => {
  try {
    const notes = await Notes.find({ user: req.user.id });
    res.json(notes);
    console.log(notes);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});
//ROUTE-2: Add a new notes usimg POSt   "/api/auth/addnote". login require
router.post(
  "/addnote",
  fetchuser,
  [
    body("title", "Title cant be empty").isLength({ min: 3 }),
    body("description", "Description must be at least 5 characters").isLength({
      min: 1,
    }),
  ],
  async (req, res) => {
    try {
      const { title, description, tag } = req.body;
      //if there r errors return bads request and errors
      const errors = validationResult(req);
      /* console.log(errors); */
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      console.log(req.user.id);
      const note = new Notes({
        user: req.user.id,
        title,
        description,
        tag,
      });
      console.log(note);
      const saveNote = await note.save();
      console.log(saveNote);

      res.json(saveNote);
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  }
);
//ROUTE-3: Update an existing notes usimg put   "/api/auth/updatenote". login require
router.put("/updatenote/:id", fetchuser, async (req, res) => {
  try {
    const { title, description, tag } = req.body;

    // create new notes
    const newNote = {};
    if (title) {
      newNote.title = title;
    }
    if (description) {
      newNote.description = description;
    }
    if (tag) {
      newNote.tag = tag;
    }

    //find the note to be updated and update
    let note = await Notes.findById(req.params.id);
    if (!note) {
      return res.status(404).send("Not Found");
    }

    if (note.user.toString() !== req.user.id) {
      return res.status(401).send("Not Allowed");
    }

    note = await Notes.findByIdAndUpdate(
      req.params.id,
      { $set: newNote },
      { new: true }
    );

    res.json(note);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

//ROUTE-4: Delete an existing notes using delete   "/api/auth/deletenote". login require
router.delete("/deletenote/:id", fetchuser, async (req, res) => {
  try {
    //find the note to be deleted and delete
    let note = await Notes.findById(req.params.id);
    if (!note) {
      return res.status(404).send("Not Found");
    }
    //Allowed deletion only if user own this note
    if (note.user.toString() !== req.user.id) {
      return res.status(401).send("Not Allowed");
    }

    note = await Notes.findByIdAndDelete(req.params.id);

    res.json({ success: "Note has been deleted", note: note });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
