/**
 * Profile Image Picker Component
 * 
 * Handles profile image selection from camera or photo library
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera, MediaType, ImagePickerResponse } from 'react-native-image-picker';

import { useThemedStyles, useTheme, spacing } from '../../theme';
import { permissionService } from '../../services/permissions/permissionService';
import type { Theme } from '../../theme';

interface ProfileImagePickerProps {
  imageUri?: string | null;
  onImageSelected: (uri: string) => void;
  size?: number;
  editable?: boolean;
}

export const ProfileImagePicker: React.FC<ProfileImagePickerProps> = ({
  imageUri,
  onImageSelected,
  size = 80,
  editable = true,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles((theme) => createStyles(theme, size));

  const showImagePicker = () => {
    Alert.alert(
      'Profile Photo',
      'Choose how you want to set your profile photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: openCamera },
        { text: 'Photo Library', onPress: openImageLibrary },
        ...(imageUri ? [{ text: 'Remove Photo', onPress: removeImage, style: 'destructive' as const }] : []),
      ]
    );
  };

  const openCamera = () => {
    // Let react-native-image-picker handle the permission request natively
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8 as const,
    };

    launchCamera(options, (response) => {
      if (response.errorCode === 'camera_unavailable') {
        Alert.alert(
          'Camera Unavailable',
          'Camera is not available on this device.',
          [{ text: 'OK' }]
        );
      } else if (response.errorCode === 'permission') {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission in Settings to take photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => permissionService.openAppSettings() },
          ]
        );
      } else {
        handleImageResponse(response);
      }
    });
  };

  const openImageLibrary = () => {
    // Let react-native-image-picker handle the permission request natively
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8 as const,
    };

    launchImageLibrary(options, (response) => {
      if (response.errorCode === 'permission') {
        Alert.alert(
          'Photo Library Permission Required',
          'Please grant photo library permission in Settings to select photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => permissionService.openAppSettings() },
          ]
        );
      } else {
        handleImageResponse(response);
      }
    });
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      if (asset.uri) {
        onImageSelected(asset.uri);
      }
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Profile Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => onImageSelected('') // Empty string to remove
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={editable ? showImagePicker : undefined}
      disabled={!editable}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholderContainer}>
            <Icon 
              name="person" 
              size={size * 0.5} 
              color={theme.textSecondary} 
            />
          </View>
        )}
        
        {editable && (
          <View style={styles.editOverlay}>
            <Icon 
              name="camera" 
              size={16} 
              color={theme.textOnPrimary} 
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

function createStyles(theme: Theme, size: number) {
  return StyleSheet.create({
    container: {
      alignSelf: 'center' as const,
    },
    imageContainer: {
      width: size,
      height: size,
      borderRadius: size / 2,
      position: 'relative' as const,
      shadowColor: theme.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    image: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.backgroundSecondary,
    },
    placeholderContainer: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    editOverlay: {
      position: 'absolute' as const,
      bottom: 0,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 2,
      borderColor: theme.surface,
    },
  });
}

export default ProfileImagePicker;