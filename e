import * as React from 'react';
import { useEffect, useState, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MainCard from 'ui-component/cards/MainCard';
import { useTheme } from '@mui/material/styles';
import {
  useMediaQuery,
  Avatar,
  Grid,
  InputAdornment,
  List,
  ListItem,
  TextField,
  Menu,
  MenuItem,
  IconButton,
  Card,
  Button
} from '@mui/material';
import { Search, TroubleshootTwoTone } from '@mui/icons-material';
import { addMessageApi, getUserChatListApi, getChatById, addDraftMessage, clearChatApi } from 'api/chatApp';
import { commonDispatch } from 'store/commonRedux/commonDispatch';
import { useSelector } from 'react-redux';
import { dispatch } from 'store';
import { SET_SINGLE_CHAT_BY_ID, SET_USER_CHAT } from 'store/actions';
import { useFormik } from 'formik';
import { FormMultipleImageUploader } from 'ui-component/form';
import { socket } from 'socket';
import { IoMdSend } from "react-icons/io";
import ImageProfile from 'ui-component/form/ImageModel';
import { CiMenuKebab } from 'react-icons/ci';
import { MdChevronLeft } from 'react-icons/md';
import { AiOutlineStop } from 'react-icons/ai';
import { FaAngleDown } from 'react-icons/fa6';


const ChatApplication = () => {
  const theme = useTheme();
  const themeColor = theme.palette.mode === 'dark' ? theme.darkTextPrimary : 'rgb(0 54 122)';
  const [chatList, setChatList] = useState([]);
  const selectedChat = useSelector((state) => state?.customization);
  const userData = useSelector((state) => state?.user);
  const [messages, setMessages] = useState([]);
  const { showNotification } = commonDispatch();
  const [selectedFile, setSelectedFile] = useState([]);
  const isMobileView = useMediaQuery('(max-width:600px)');
  const isLargeView = useMediaQuery('(min-width:600px)');
  const [isMenuOpen, setIsMenuOpen] = React.useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isEdit, setIsEdit] = useState(null);
  const messagesEndRef = useRef(null);

  const [selectedChatId, setSelectedChatId] = useState();

  let imageUrlData = []
  let isUpdatingImagesRef = useRef(false);
  const previousChatId = useRef(null);

  const getUserChatList = async () => {
    let response = await getUserChatListApi();
    setChatList(response?.data?.data);
  };
  const handleSubmit = async (values, { resetForm }) => {
    isUpdatingImagesRef.current = false;

    const updatedImageData = Array.from(formik?.values?.image).map((file) => {
      if (typeof file === "object" && file !== null) {
        return file.name;
      } else {
        const findIndex = file?.lastIndexOf("/");

        if (findIndex) {
          return file?.substring(findIndex + 1, file?.length);
        }
        return file;
      }
    });
    const data = {
      is_draft: 0,
      sender_id: userData?.userData?.id,
      receiver_id: selectedChat?.selectedUser?.id,
      message: values?.message,
      file: updatedImageData,
      folderName: "/chats"
    };
    if (isEdit) {
      socket.emit('updateMessage', {
        ...data,
        id: isEdit
      });
      setIsEdit(null);
    } else {
      socket.emit('sendMessage', data);
      formik.setFieldValue('image', []);
      formik.setFieldValue('message', "");
    }
    resetForm();
  };

  const formik = useFormik({
    initialValues: {
      sender_id: selectedChat?.singleChatData?.sender_id | '',
      receiver_id: selectedChat?.singleChatData?.receiver_id | '',
      message: '',
      image: []
    },
    onSubmit: handleSubmit
  });

  //  Get selected single user chat data
  const getSingleChatData = async (user) => {


    if (!user && !selectedChat?.selectedUser) return;

    let formData = new FormData();
    user?.userData?.id && dispatch({ type: SET_SINGLE_CHAT_BY_ID, selectedUser: user?.userData });

    let data = {
      sender_id: userData?.userData?.id,
      receiver_id: user?.userData?.id ? user?.userData?.id : selectedChat?.selectedUser?.id
    };
    if (user) {
      setSelectedChatId(user?.userData?.id);
    }
    else {
      setSelectedChatId(selectedChat?.selectedUser?.id);
    }

    if (formik?.values?.image && formik?.values?.image.length > 0) {
      formik?.values?.image.forEach((file, index) => {
        if (typeof (file) != "object") {
          const findIndex = file?.lastIndexOf("/")
          if (findIndex) {
            file = file?.substring(findIndex + 1, file?.length)
          }
        }
        formData.append('file', file);
      });
    }
    formData.append("folderName", "/chats")
    formData.append("is_draft", 1);
    formData.append("sender_id", userData?.userData?.id);
    if (selectedChatId != undefined) {
      formData.append("receiver_id", selectedChatId);
    }
    else {
      formData.append("receiver_id", previousChatId.current);
    }
    formData.append("message", formik?.values?.message);

    if (
      user &&
      (formik?.values?.message !== null && formik?.values?.message !== undefined && formik?.values?.message !== "" ||
        formik?.values?.image?.length > 0)
    ) {

      let addDraft = await addDraftMessage(formData)
    }
    previousChatId.current = selectedChatId;
    try {
      const response = await getChatById(data);

      if (response?.status === 200) {
        setMessages(response?.data?.data?.getUserChat);
        socket.emit('readMessage', data);

        if (response?.data?.data?.getDraftMessageData?.receiver_id == (user?.userData?.id || selectedChat?.selectedUser)) {
          formik.setFieldValue('message', response?.data?.data?.getDraftMessageData?.chat_messages[0]?.message);
          if (response?.data?.data?.getDraftMessageData?.chat_messages[0]?.chat_attachments.length > 0)

            response?.data?.data?.getDraftMessageData?.chat_messages[0]?.chat_attachments?.map((data) => {
              imageUrlData.push(data?.attachments)
            })
          formik.setFieldValue('image', imageUrlData);
        }
        else {
          formik.setFieldValue('image', []);
          formik.setFieldValue('message', "");
        }
      } else {
        showNotification({
          title: 'Error',
          message: response?.data?.message,
          status: 'error',
          isOpen: true
        });
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error.message || 'An error occurred while fetching the chat data',
        status: 'error',
        isOpen: true
      });
    }
    getUserChatList();
  };



  const handleChange = (event) => {

    if (event?.target?.value == "") {
      formik.setFieldValue('message', "");
      formik.setFieldValue('image', []);
      const data = {
        "sender_id": userData?.userData?.id,
        "receiver_id": selectedChatId,
        "message": event?.target?.value,
        "file": formik?.values?.image
      }

      socket.emit('draftMessage', data);
    }
    else {
      formik.setFieldValue('message', event.target.value.trimStart());
    }
    isUpdatingImagesRef.current = true;

  }


  useEffect(() => {

    socket.on('message', (messageData) => {

      if (messageData?.userId && userData?.userData?.id) {

        getSingleChatData();


        getUserChatList();
      }
    });

    socket.on('read_confirmation', (messageData) => {
      if (messageData?.userId === userData?.userData?.id) {
        getUserChatList();
      }
    });

    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setSelectedChatId(selectedChatId)

    return () => {
      socket.off('message');
      socket.off('read_confirmation');
    };
  }, [socket, messages, selectedChat]);

  useEffect(() => {
    getUserChatList();
    getSingleChatData();
  }, []);


  const open = Boolean(isMenuOpen);

  const handleClick = (event) => {
    setIsMenuOpen(event.currentTarget);
  };

  // Edit Menu handling
  const handleMenuClick = (event, message) => {
    event.preventDefault();
    setIsMenuOpen(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(null);
    setSelectedMessage(null);
  };

  const handleEditMessage = (msgId, msg) => {
    setIsEdit(msgId);
    formik.setFieldValue('message', msg);
    setIsMenuOpen("");
  };

  const clearAllMsg = async () => {
    const data = {
      sender_id: userData?.userData?.id,
      receiver_id: selectedChat?.selectedUser?.id,
    };
    const response = await clearChatApi(data);
    if (response?.status === 200) {
      setMessages([]);
      getUserChatList();
      setIsMenuOpen('');
    }
  }
  const handleDeleteMessage = (id, deleteForEveryone) => {
    const data = {
      id: [id],
      delete_for_everyone: false || deleteForEveryone,
      sender_id: userData?.userData?.id,
      receiver_id: selectedChat?.selectedUser?.id
    };
    socket.emit('deleteMessage', data);
    setIsMenuOpen('');
  };

  const linkTextMessage = (text, msg) => {
    let is_edit = msg?.chat_messages?.[0]?.is_edit;
    const urlRegex = /(http[^\s]+)/i;

    const parts = text?.split(urlRegex);

    return parts?.map((part, index) => {
      if (urlRegex?.test(part)) {
        return is_edit === 1 ? (
          <a key={index} href={part} target="_blank" style={{ color: 'blue', textDecoration: 'underline' }}>
            {part}
          </a>
        ) : (
          <a key={index} href={part} target="_blank" style={{ color: 'blue', textDecoration: 'underline' }}>
            {part}
          </a>
        );
      } else {
        return is_edit === 1 ? (
          <Box component="span" key={index} sx={{ display: 'flex', position: 'relative' }}>
            {part}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                justifyContent: 'flex-end',
                color: '#0078A6',
                position: 'absolute',
                right: 0,
                fontSize: isLargeView ? '10px' : '8px',
                bottom: isLargeView ? '-1.2em' : '-1.5em'
              }}
            >
              Edited
            </Box>
          </Box>
        ) : (
          <Box component="span" key={index}>
            {part}
          </Box>
        );
      }
    });
  };

  return (
    <Grid sx={{ height: '100%' }}>
      <Grid sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', width: '100%', gap: '20px' }}>
          {/* left side part */}
          {!isMobileView || !messages ? (
            <MainCard
              sx={{
                flex: { xs: '0 0 100%', sm: '0 0 45%', md: '0 0 40%', lg: '0 0 30%', xl: '0 0 25%' },
                height: '100vh',
                maxHeight: '80vh',
                // overflow: 'auto'
              }}
            >
              {/* Search Bar */}
              <Grid>
                <TextField
                  variant="outlined"
                  placeholder="Search user or group"
                  fullWidth
                  sx={{
                    bgcolor: '#3a3a3a',
                    borderRadius: '12px',
                    mb: 2,
                    input: { color: 'black' }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'black' }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              {/* User List */}
              <List sx={{ color: 'white', overflowY: 'auto' }}>
                {chatList?.map((user, index) => {
                  return (
                    <>
                      <ListItem
                        key={index}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mb: 1,
                          bgcolor: selectedChat?.selectedUser?.id === user?.userData?.id ? '#B3D2F1' : 'transparent',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          p: 1,
                          '&:hover': {
                            bgcolor: '#B3D2F1',
                            transition: 'all 0.3s ease'
                          }
                        }}
                        onClick={() => getSingleChatData(user)}
                      >
                        <Avatar sx={{ mr: 2, cursor: 'pointer' }} src={user?.userData?.image} />

                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ color: '#A5A6A5' }}>
                            {user?.userData?.first_name}
                            {''} {user?.userData?.last_name}
                          </Typography>

                          <Typography variant="body2" color="textSecondary">

                            {user?.chat_messages?.is_delete == 1 ? (
                              <>
                                <AiOutlineStop />
                                {user?.data?.sender_id === userData?.userData?.id ? 'You deleted this message' : 'This message was deleted'}
                              </>
                            ) : user?.chat_messages?.is_draft == 1 ? (
                              <>
                                <span style={{ color: "#002955" }}>Draft: </span>
                                {user?.chat_messages?.message ? (
                                  user.chat_messages.message
                                ) : (
                                  <>
                                    <FaFileAlt /> files
                                  </>
                                )}
                              </>
                            ) : (
                              user?.data?.sender_id == userData?.userData?.id && user?.chat_messages?.is_sender_clear == 1 ?
                                '' : user?.chat_messages?.is_sender_clear == 1 && user?.chat_messages?.is_receiver_clear == 1 ? '' : user?.chat_messages?.message
                            )}
                          </Typography>

                        </Box>
                        <Typography variant="caption" sx={{ color: 'gray' }}></Typography>
                      </ListItem>
                    </>
                  );
                })}
              </List>
            </MainCard>
          ) : null}

          {/* right side part*/}
          {(isLargeView || (isMobileView && messages)) && (
            <Card
              sx={{
                flex: isLargeView ? '1' : '0 0 100%',
                height: '100vh',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: isLargeView ? 'column' : 'column',
                overflow: "auto",
                position: 'relative',
              }}
            >


              {messages && selectedChat?.selectedUser ?
                <>
                  {/*  User Info */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      maxWidth: isLargeView ? '100%' : '95%',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      bgcolor: 'background.paper',
                      borderBottom: '1px solid #ccc',
                      padding: "20px",
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {/* Back  */}
                        {isLargeView ? (
                          <></>
                        ) : (
                          <>
                            <MdChevronLeft size={24} sx={{ cursor: 'pointer', mr: 2 }} onClick={() => setMessages(null)} />
                          </>
                        )}

                        <ImageProfile
                          src={selectedChat?.selectedUser?.image}
                          alt="Profile Photo"
                          style={{
                            cursor: 'pointer',
                            height: '50px',
                            width: '50px',
                            borderRadius: '100%',
                            objectFit: 'fill',
                            border: '1px solid #0078a6'
                          }}
                        />

                        <Box sx={{ ml: 2 }}>
                          <Typography variant="h6" sx={{ color: themeColor }}>
                            {selectedChat?.selectedUser?.first_name} {selectedChat?.selectedUser?.last_name}


                          </Typography>
                        </Box>
                      </Box>

                      {/* Menu Option */}
                      <CiMenuKebab
                        size={24}
                        id="basic-button"
                        aria-controls={open ? 'basic-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={open ? 'true' : undefined}
                        onClick={handleClick}
                        style={{ cursor: 'pointer', marginRight: '5%' }}
                      />

                      <>{isMenuOpen &&
                        <Menu
                          anchorEl={isMenuOpen}
                          open={Boolean(isMenuOpen)}
                          onClose={handleMenuClose}
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right'
                          }}
                          transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right'
                          }}
                          sx={{
                            '& .MuiPaper-root': {
                              border: 'none',
                              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                            }
                          }}
                        >
                          <MenuItem onClick={clearAllMsg}>Clear all chat</MenuItem>
                        </Menu>
                      }
                      </>
                    </Box>
                  </Box>

                  {/* Chat History */}
                  {messages?.length > 0 && selectedChat?.selectedUser ?
                    <Box
                      sx={{
                        flex: 1,
                        p: 2
                      }}
                    >
                      <List>
                        {messages?.map((msg, index) => {
                          return (
                            <React.Fragment key={index}>
                              {msg.sender_id !== msg?.id && (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center'
                                  }}
                                ></Box>
                              )}

                              <ListItem
                                sx={{
                                  paddingLeft: '0px',
                                  justifyContent: msg?.sender_id === userData?.userData?.id ? 'flex-end' : 'flex-start',
                                  alignItems: 'flex-start'
                                }}
                              >
                                {msg?.chat_messages?.[0]?.is_delete == 1 ? (
                                  <Box
                                    sx={{
                                      bgcolor: msg?.sender_id === userData?.userData?.id ? '#dcf8c6' : '#fff',
                                      paddingLeft: '0px'
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontStyle: 'italic',
                                        color: 'grey',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <AiOutlineStop />
                                      {msg?.sender_id === userData?.userData?.id ? 'You deleted this message' : 'This message was deleted'}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <>
                                    <Box
                                      onContextMenu={(e) => handleMenuClick(e, msg)}
                                      sx={{
                                        bgcolor: msg?.sender_id === userData?.userData?.id ? '#dcf8c6' : '#fff',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        width: 'fit-content',
                                        minWidth: '12%',
                                        wordWrap: 'break-word',
                                        color: 'textSecondary',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                        display: 'flex',
                                        flexDirection: 'column'
                                      }}
                                    >
                                      {msg?.chat_attachments?.map((data, imgIndex) => (
                                        <Box sx={{ mt: 1 }} key={imgIndex}>
                                          <img
                                            src={data.attachment}
                                            style={{
                                              maxWidth: '100%',
                                              height: 'auto',
                                              objectFit: 'cover',
                                              borderRadius: '8px',
                                              marginBottom: '8px'
                                            }}
                                            alt="uploaded attachment"
                                          />
                                        </Box>
                                      ))}

                                      <Typography variant="body2">
                                        {linkTextMessage(msg?.chat_messages?.[0]?.message || msg?.message, msg)}
                                      </Typography>
                                    </Box>
                                    {/* {/ Render the Menu next to the message /} */}
                                    {msg?.sender_id === userData?.userData?.id && (
                                      <Box
                                        aria-label="options"
                                        onClick={(e) => handleMenuClick(e, msg)}
                                        sx={{
                                          padding: '4px',
                                          marginLeft: '8px',
                                          position: 'absolute',
                                          right: '17px',
                                          top: '5px'
                                        }}
                                      >
                                        <FaAngleDown style={{ fontSize: '10px' }} />
                                      </Box>
                                    )}
                                    {msg?.sender_id === userData?.userData?.id && (
                                      <>
                                        <Menu
                                          anchorEl={isMenuOpen}
                                          open={Boolean(isMenuOpen && selectedMessage === msg)}
                                          onClose={handleMenuClose}
                                          anchorOrigin={{
                                            vertical: 'bottom',
                                            horizontal: 'right'
                                          }}
                                          transformOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right'
                                          }}
                                          sx={{
                                            '& .MuiPaper-root': {
                                              border: 'none',
                                              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                                            }
                                          }}
                                        >
                                          <MenuItem onClick={() => handleEditMessage(msg?.id, msg?.chat_messages[0]?.message)}>Edit</MenuItem>
                                          <MenuItem onClick={() => handleDeleteMessage(msg?.id)}>Delete for me</MenuItem>
                                          <MenuItem onClick={() => handleDeleteMessage(msg?.id, true)}>Delete for everyone</MenuItem>
                                        </Menu>
                                      </>
                                    )}
                                  </>
                                )}
                              </ListItem>
                            </React.Fragment>
                          );
                        })}
                        <Box ref={messagesEndRef} />

                        {chatList?.map((data) => {
                          if (data?.userData?.id === userData?.userData?.id || data?.userData?.id === selectedChat?.selectedUser?.id) {
                            return <Box
                              sx={{
                                textAlign: "end",
                                color: "#c5cacf",
                                paddingRight: "16px",
                              }}
                            >{data?.chat_messages?.is_read == 1 ? 'seen' : ''}</Box>
                          }
                        })}

                      </List>
                    </Box>
                    :
                    <Box
                      sx={{
                        height: "100%",
                        textAlign: "center",
                        marginTop: "200px",
                      }}
                    >No messages found !!</Box>
                  }
                  {/* <Box
                                        sx={{
                                            flex: 1,
                                            p: 2
                                        }}
                                    >
                                        <List>
                                            {messages?.map((msg, index) => {
                                                return (
                                                    <React.Fragment key={index}>
                                                        {msg.sender_id !== msg?.id && (
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    flexDirection: 'row',
                                                                    alignItems: 'center'
                                                                }}
                                                            ></Box>
                                                        )}

                                                        <ListItem
                                                            sx={{
                                                                paddingLeft: '0px',
                                                                justifyContent: msg?.sender_id === userData?.userData?.id ? 'flex-end' : 'flex-start',
                                                                alignItems: 'flex-start'
                                                            }}
                                                        >
                                                            {msg?.chat_messages?.[0]?.is_delete == 1 ? (
                                                                <Box
                                                                    sx={{
                                                                        bgcolor: msg?.sender_id === userData?.userData?.id ? '#dcf8c6' : '#fff',
                                                                        paddingLeft: '0px'
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{
                                                                            fontStyle: 'italic',
                                                                            color: 'grey',
                                                                            display: 'flex',
                                                                            alignItems: 'center'
                                                                        }}
                                                                    >
                                                                        <AiOutlineStop />
                                                                        {msg?.sender_id === userData?.userData?.id ? 'You deleted this message' : 'This message was deleted'}
                                                                    </Typography>
                                                                </Box>
                                                            ) : (
                                                                <>
                                                                    <Box
                                                                        onContextMenu={(e) => handleMenuClick(e, msg)}
                                                                        sx={{
                                                                            bgcolor: msg?.sender_id === userData?.userData?.id ? '#dcf8c6' : '#fff',
                                                                            borderRadius: '8px',
                                                                            padding: '10px',
                                                                            width: 'fit-content',
                                                                            minWidth: '12%',
                                                                            wordWrap: 'break-word',
                                                                            color: 'textSecondary',
                                                                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                                                            display: 'flex',
                                                                            flexDirection: 'column'
                                                                        }}
                                                                    >
                                                                        {msg?.chat_attachments?.map((data, imgIndex) => (
                                                                            <Box sx={{ mt: 1 }} key={imgIndex}>
                                                                                <img
                                                                                    src={data.attachment}
                                                                                    style={{
                                                                                        maxWidth: '100%',
                                                                                        height: 'auto',
                                                                                        objectFit: 'cover',
                                                                                        borderRadius: '8px',
                                                                                        marginBottom: '8px'
                                                                                    }}
                                                                                    alt="uploaded attachment"
                                                                                />
                                                                            </Box>
                                                                        ))}

                                                                        <Typography variant="body2">
                                                                            {linkTextMessage(msg?.chat_messages?.[0]?.message || msg?.message, msg)}
                                                                        </Typography>
                                                                    </Box>
                                                                  
                                                                    {msg?.sender_id === userData?.userData?.id && (
                                                                        <Box
                                                                            aria-label="options"
                                                                            onClick={(e) => handleMenuClick(e, msg)}
                                                                            sx={{
                                                                                padding: '4px',
                                                                                marginLeft: '8px',
                                                                                position: 'absolute',
                                                                                right: '17px',
                                                                                top: '5px'
                                                                            }}
                                                                        >
                                                                            <FaAngleDown style={{ fontSize: '10px' }} />
                                                                        </Box>
                                                                    )}
                                                                    {msg?.sender_id === userData?.userData?.id && (
                                                                        <>
                                                                            <Menu
                                                                                anchorEl={isMenuOpen}
                                                                                open={Boolean(isMenuOpen && selectedMessage === msg)}
                                                                                onClose={handleMenuClose}
                                                                                anchorOrigin={{
                                                                                    vertical: 'bottom',
                                                                                    horizontal: 'right'
                                                                                }}
                                                                                transformOrigin={{
                                                                                    vertical: 'top',
                                                                                    horizontal: 'right'
                                                                                }}
                                                                                sx={{
                                                                                    '& .MuiPaper-root': {
                                                                                        border: 'none',
                                                                                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <MenuItem onClick={() => handleEditMessage(msg?.id, msg?.chat_messages[0]?.message)}>Edit</MenuItem>
                                                                                <MenuItem onClick={() => handleDeleteMessage(msg?.id)}>Delete for me</MenuItem>
                                                                                <MenuItem onClick={() => handleDeleteMessage(msg?.id, true)}>Delete for everyone</MenuItem>
                                                                            </Menu>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </ListItem>
                                                    </React.Fragment>
                                                );
                                            })}
                                            <Box ref={messagesEndRef} />
                                        </List>
                                    </Box> */}

                  {/* Text Area */}
                  <Box
                    sx={{
                      position: 'sticky',
                      bottom: 0,
                      zIndex: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: 'background.paper',
                      width: '100%',
                      p: 2,
                    }}
                    component="form"
                    onSubmit={formik.handleSubmit}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexDirection: "row-reverse",
                        gap: 2,
                      }}
                    >
                      <Box sx={{ width: "40px", display: "flex", justifyContent: "center" }}>
                        {(formik?.values?.message !== '' || (formik?.values?.image?.length > 0)) ? (
                          <Button
                            onClick={formik.submitForm}
                            sx={{ minWidth: "auto", fontSize: "20px" }}
                          >
                            <IoMdSend />
                          </Button>
                        ) : (
                          <FormMultipleImageUploader
                            selectedFiles={selectedFile}
                            setSelectedFiles={setSelectedFile}
                            formik={formik}
                            folderName="/chats"
                            id="image-form-upload"
                            label="Upload images"
                            name="image"
                            refValue={isUpdatingImagesRef}
                            mainLabel="Image"
                            errorMessage={formik.errors.image}
                            required={true}
                            fileType="image/*"
                          />
                        )}
                      </Box>

                      <TextField
                        placeholder="Type a message"
                        name="message"
                        value={formik.values.message}
                        onChange={(e) => handleChange(e)}
                        sx={{ flexGrow: 1 }}
                      />
                    </Box>
                  </Box>
                </>
                :
                <Typography variant="body1" sx={{ color: 'gray', textAlign: 'center', marginTop: "100px" }}>
                  Select a user to view chat
                </Typography>
              }
            </Card>
          )}
        </Box>
      </Grid>
    </Grid>
  );
};

export default ChatApplication;



const express = require('express');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const http = require('http');
// const { Server } = require('socket.io');

// // Load env
// dotenv.config();

// // Express app
// const app = express();
// app.use(cors());
// app.use(express.json());

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => {
//   console.log('✅ MongoDB Connected');
// }).catch(err => {
//   console.error('❌ MongoDB Connection Failed:', err);
// });

// // Models
// const PublicMessage = require('./models/PublicMessage');
// const PrivateMessage = require('./models/PrivateMessage');
// const User = require('./models/userModel'); // your user model

// // Routes
// const userRoutes = require('./routes/userRoutes');
// const loginRoutes = require('./routes/loginRoutes');
// const messageRoutes = require('./routes/messageRoutes');
// app.use('/api/users', userRoutes);
// app.use('/api/users', loginRoutes);
// app.use('/api',messageRoutes);


// // Custom route: get all users
// app.get('/api/all-users', async (req, res) => {
//   try {
//     const users = await User.find({}, '-password'); // exclude password
//     res.json(users);
//   } catch (err) {
//     res.status(500).json({ error: 'Error fetching users' });
//   }
// });

// // HTTP server + Socket.IO
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
// });

// // In-memory map of online users: userId -> socket.id
// const onlineUsers = new Map();

// // WebSocket Events
// io.on('connection', (socket) => {
//   const userId = socket.handshake.auth?.userId;

//   if (userId) {
//     onlineUsers.set(userId, socket.id);
//     console.log(`🟢 ${userId} connected as ${socket.id}`);
//   }

//   // --- Public Chat ---
//   PublicMessage.find().sort({ timestamp: 1 }).limit(100).then((messages) => {
//     socket.emit('public-chat-history', messages);
//   });

//   socket.on('public-message', async ({ sender, message }) => {
//     const msg = new PublicMessage({ sender, message });
//     await msg.save();
//     io.emit('public-message', {
//       sender,
//       message,
//       timestamp: msg.timestamp
//     });
//   });

//   // --- Private Chat ---
// socket.on("load-messages", async ({ currentUserId, selectedUserId }) => {
// const messages = await PrivateMessage.find({
//     $or: [
//       { senderId: currentUserId, receiverId: selectedUserId },
//       { senderId: selectedUserId, receiverId: currentUserId }
//     ]
//   }).sort({ timestamp: 1 });

//   socket.emit("message-history", messages);
// });


// // Inside io.on("connection") {...}
// socket.on("send-message", async ({ senderId, receiverId, message }) => {
//   try {
//     const msg = await PrivateMessage.create({ senderId, receiverId, message });
//     console.log("✅ Message saved:", msg);

//     const receiverSocketId = onlineUsers.get(receiverId);
//     console.log(`🔵 Sending message to ${receiverId} (Socket ID: ${receiverSocketId})`);
//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit("receive-message", msg);
//     }
// io.to(receiverSocketId).emit("receive-message", msg); 
//     socket.emit("message-sent", msg);
//   } catch (err) {
//     console.error("❌ Error saving message:", err);
//     socket.emit("error", { message: "Failed to send message." });
//   }
// });



//   // --- Disconnect ---
//   socket.on('disconnect', () => {
//     console.log(`🔴 ${socket.id} disconnected`);
//     for (let [uid, sid] of onlineUsers.entries()) {
//       if (sid === socket.id) {
//         onlineUsers.delete(uid);
//         break;
//       }
//     }
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`🚀 Server running with WebSocket on port ${PORT}`);
// });
