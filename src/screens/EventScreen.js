import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, TextInput, SafeAreaView, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../context/AppContext';

export default function EventScreen() {
  const { addEvent } = useAppContext();
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    category: '',
    date: '',
    location: '',
    image: null,
    publisher: 'company'
  });

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Permission Required', 'We need camera and photo library permissions to share photos and videos.');
      return false;
    }
    return true;
  };

  const pickEventImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setEventData(prev => ({ ...prev, image: result.assets[0] }));
    }
  };

  const publishEvent = () => {
    if (!eventData.title || !eventData.description || !eventData.category) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    // 将事件添加到全局状态
    addEvent(eventData);

    Alert.alert('Success', 'Event published successfully!', [
      {
        text: 'OK',
        onPress: () => {
          setEventData({
            title: '',
            description: '',
            category: '',
            date: '',
            location: '',
            image: null,
            publisher: 'company'
          });
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Create Event</Text>
        <Text style={styles.subtitle}>BabyTree Surrogacy - Company Events</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.userInfo}>
          <View style={[styles.userAvatar, styles.companyAvatar]}>
            <Icon name="briefcase" size={20} color="#fff" />
          </View>
          <Text style={styles.userName}>BabyTree Surrogacy</Text>
        </View>
        
        <Text style={styles.inputLabel}>Event Title *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter event title..."
          value={eventData.title}
          onChangeText={(text) => setEventData(prev => ({ ...prev, title: text }))}
        />
        
        <Text style={styles.inputLabel}>Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Describe your event..."
          value={eventData.description}
          onChangeText={(text) => setEventData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
        />
        
        <Text style={styles.inputLabel}>Category *</Text>
        <View style={styles.categoryContainer}>
          {[
            { key: 'transplant', label: '🌱 Transplant', value: 'transplant' },
            { key: 'medical', label: '🏥 Medical', value: 'medical' },
            { key: 'gathering', label: '🎉 Gathering', value: 'gathering' },
            { key: 'celebration', label: '🎊 Celebration', value: 'celebration' }
          ].map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryButton,
                eventData.category === category.value && styles.categoryButtonSelected
              ]}
              onPress={() => setEventData(prev => ({ ...prev, category: category.value }))}
            >
              <Text style={[
                styles.categoryButtonText,
                eventData.category === category.value && styles.categoryButtonTextSelected
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.inputLabel}>Date (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., March 15, 2024"
          value={eventData.date}
          onChangeText={(text) => setEventData(prev => ({ ...prev, date: text }))}
        />
        
        <Text style={styles.inputLabel}>Location (Optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., Los Angeles, CA"
          value={eventData.location}
          onChangeText={(text) => setEventData(prev => ({ ...prev, location: text }))}
        />
        
        <TouchableOpacity style={styles.imageButton} onPress={pickEventImage}>
          <Text style={styles.imageButtonText}>
            {eventData.image ? '📷 Change Image' : '📷 Add Image'}
          </Text>
        </TouchableOpacity>
        
        {eventData.image && (
          <Image source={{ uri: eventData.image.uri }} style={styles.previewImage} />
        )}
        
        <TouchableOpacity style={styles.publishButton} onPress={publishEvent}>
          <Text style={styles.publishButtonText}>Publish Event</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FB' 
  },
  headerContainer: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 20,
    marginBottom: 10
  },
  content: {
    flex: 1,
    paddingHorizontal: 20
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  companyAvatar: {
    backgroundColor: '#2A7BF6'
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  categoryButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  categoryButtonSelected: {
    backgroundColor: '#28a745',
    borderColor: '#28a745'
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666'
  },
  categoryButtonTextSelected: {
    color: '#fff',
    fontWeight: '600'
  },
  imageButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  imageButtonText: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600'
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16
  },
  publishButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  publishButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600'
  }
});

