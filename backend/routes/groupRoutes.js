const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, groupController.createGroup);
router.post('/join', authMiddleware, groupController.joinGroup);
router.get('/', authMiddleware, groupController.getUserGroups);
router.get('/:groupId', authMiddleware, groupController.getGroup);
router.post('/:groupId/invite', authMiddleware, groupController.generateInvite);
<<<<<<< HEAD
router.get('/:groupId/members', authMiddleware, groupController.getGroupMembers);
router.delete('/:groupId/members/:memberId', authMiddleware, groupController.removeMember);


=======



router.get('/:groupId/members', authMiddleware, groupController.getGroupMembers);
router.delete('/:groupId/members/:userId', authMiddleware, groupController.removeMember);

>>>>>>> 346f2acb384a3d409b54d75d527c9188a3eca5c9
module.exports = router;
