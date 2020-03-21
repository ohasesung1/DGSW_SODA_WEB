import React, { useState, useEffect } from 'react';
import { observer, inject } from 'mobx-react';
import PropTypes from 'prop-types';
import Template from 'components/BambooWrite/BambooWriteTemplate';
import GroupingState from 'lib/HookState/GroupingState';
import DEFAULT_PROFILE from 'assets/image/panda.jpg';

const BambooWrite = ({ store }) => {
  const { modal } = store.dialog;
  const { applyBambooPost } = store.bamboo;
  const { uploadImage } = store.upload;

  const [contents, setContents] = useState('');
  const [name, setName] = useState('익명의 판다');
  const [profileSrc, setProfileSrc] = useState(DEFAULT_PROFILE);
  const [accessToken, setAccessToken] = useState('');

  const [images, setImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  // 익명 타입 : anonymous, 실명 타입 : realname
  const [isType, setIsType] = useState('empty');

  const [imageContents, setImageContents] = useState('');

  const handleInitialState = () => {
    setContents('');
    setName('익명의 판다');
    setProfileSrc(DEFAULT_PROFILE);
    setAccessToken('');
    setImages([]);
    setPreviewImages([]);
    setIsType('empty');
  };

  const handleIsType = event => {
    const type = event.target.value;

    if (type === isType) return;
    
    setIsType(type);
  };

  const handleArrangeFiles = () => {
    images.forEach((data, idx) => {
      data.idx = idx;
    });
  };

  const handleImageSetting = imageFiles => {
    const fileList = images;
    
    const fileLength = imageFiles.length;
    
    let i = 0;

    while(i < fileLength){
      const file = imageFiles[i];
      fileList.push(file);
      i++;
    }

    setImages(fileList);

    handleArrangeFiles();
  };

  const handleImageCancel = (canceledIdx) => {
    images.some(data => {
      const { idx } = data;
      if(idx === canceledIdx){
        images.splice(idx, 1);
        setFiles(files);
        return true;
      }
    });
    handleArrangeFiles();
  };

  const handleImageChange = event => {
    let imageFiles;

    imageFiles = event.target.files;
    
    handleImageSetting(imageFiles);
  };

  const handleFaceBookLogin = response => {
    if (response.status === 'connected') return;
    setName(response.name);
    setProfileSrc(response.picture.data.url);
    setAccessToken(response.accessToken);
  };

  const handleImageName = (imageFileName) => {
    let splitedName = '';
    const typeName = imageFileName[imageFileName.length - 1];
    if(imageFileName.length > 2){
      for(let i = 0; i < imageFileName.length; i++){
        if(i === imageFileName.length - 2){
          splitedName = splitedName.concat(imageFileName[i]);
        } else if(i === imageFileName.length - 1 || imageFileName[i] === ''){
          continue;
        } else {
          splitedName = splitedName.concat(imageFileName[i]).concat('_');
        }
      }
    } else {
      splitedName = imageFileName[0];
    }
    return { splitedName, typeName };
  };

  const handleImageRandomedName = () => {
    const uploadName = 'SB_IMG_';
    const randomName =  (Math.floor(Math.random() * 100000000000) + 10000).toString();
    return uploadName.concat(randomName);
  };

  const handleImageFormData = async() => {
    let picture = [];
    let isUploadError = false;

    for(let image of images){
      const formData = new FormData();
      const { name, type, isDefault, originalName, uploadName  } = image;
      const isImg = type.split('/');

      if(isImg[0] !== 'image'){
        isUploadError = true;
        modal({
          title: 'Error',
          stateType: 'error',
          contents: '이미지만 올려주세요.'
        });
        break;
      }

      const { splitedName, typeName } = handleImageName(name.split('.'));
      const randomedName = handleImageRandomedName();

      formData.append('img', image);

      await uploadImage(formData)
        .then(response => {
          const data = {
            // originalName: splitedName,
            uploadName: response.data.imgs[0].fileName,
            type: response.data.imgs[0].fileType
          };

          picture = [...picture, data];
        }).catch(error => {
          const { status } = error.response;
          isUploadError = true;
          if(status === 400){
            modal({
              title: 'Error',
              stateType: 'error',
              contents: '이미지가 아닙니다.'
            });
            return true;
          }
        });
    }

    return { picture, isUploadError };
  };

  const handlePostRequest = async () => {
    const { picture, isUploadError } = await handleImageFormData();

    let data;

    if (contents.length === 0) {
      modal({
        title: 'Warning!',
        stateType: 'warning',
        contents: '대나무(이야기)가 비어있습니다!'
      });

      return;
    }

    if (isType === 'empty') {
      modal({
        title: 'Warning!',
        stateType: 'warning',
        contents: '게시물 타입을 지정해 주세요!'
      });

      return;
    }

    if (isType === 'anonymous') {
      if (images.length === 0) {
        data = {
          picture: null,
          name,
          profileImage: null,
          contents
        };
      } else {
        data = {
          picture,
          name,
          profileImage: null,
          contents
        };
      }
    }

    if (isType === 'realname') {
      if (images.length === 0) {
        data = {
          picture: null,
          name,
          profileImage: profileSrc,
          contents
        };
      } else {
        data = {
          picture,
          name,
          profileImage: profileSrc,
          contents
        };
      }
    }
    
    if (!isUploadError) {
      await applyBambooPost(data)
        .then(async response => {
          await modal({
            title: 'Success!',
            stateType: 'success',
            contents: '대나무(이야기)를 제보했습니다.(관리자 승인을 기다려주세요!)'
          });

          await handleInitialState();
        })
        .catch(async error => {
          const { status } = error.response;

          if (status === 400) {
            await modal({
              title: 'Error!',
              stateType: 'error',
              contents: '대나무가 국산이 아니네요. (양식이 올바르지 않습니다.)'
            });

            return;
          }
          
          if (status === 500) {
            await modal({
              title: 'Error!',
              stateType: 'error',
              contents: '대나무가 상했어요..ㅠㅠ 기다려주세요!'
            });

            return;
          }
        });
    }
  };

  useEffect(() => {
    if (isType === 'anonymous') {
      setName('익명의 판다');
      setProfileSrc(DEFAULT_PROFILE);
      setAccessToken('');
    }
  }, [isType]);

  return (
    <Template
      profileSrc={profileSrc}
      name={name}
      accessToken={accessToken}
      contentsObj={GroupingState('contents', contents, setContents)}
      imagesObj={GroupingState('images', images, setImages)}
      isType={isType}
      handleIsType={handleIsType}
      handleImageChange={handleImageChange}
      handleFaceBookLogin={handleFaceBookLogin}
      handlePostRequest={handlePostRequest}
    />
  );
};

BambooWrite.propTypes = {
  store: PropTypes.object
};

export default inject('store')(observer(BambooWrite));
