import React, { useState } from 'react';
import { View, Modal, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface ReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, isGroupEligible: boolean) => void;
}

const reasons = ["academic", "family", "relationships", "others"];

export default function ReasonModal({
  visible,
  onClose,
  onConfirm,
}: ReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState(reasons[0]);
  const [isGroupEligible, setIsGroupEligible] = useState(false);

  const handleConfirm = () => {
    onConfirm(selectedReason, isGroupEligible); // Pass selected reason and group eligibility to parent component
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select Reason for Appointment</Text>

          <Picker
            selectedValue={selectedReason}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedReason(itemValue)}
          >
            {reasons.map((reason) => (
              <Picker.Item
                key={reason}
                label={reason.charAt(0).toUpperCase() + reason.slice(1)}
                value={reason}
              />
            ))}
          </Picker>

          {/* New Group Eligibility Section */}
          <View style={styles.groupEligibilityContainer}>
            <Text style={styles.groupEligibilityText}>
              Are you open to potentially joining a group session?
            </Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  isGroupEligible === true && styles.radioButtonSelected,
                ]}
                onPress={() => setIsGroupEligible(true)}
              >
                <Text
                  style={[
                    styles.radioText,
                    isGroupEligible === true && styles.radioTextSelected,
                  ]}
                >
                  Yes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  isGroupEligible === false && styles.radioButtonSelected,
                ]}
                onPress={() => setIsGroupEligible(false)}
              >
                <Text
                  style={[
                    styles.radioText,
                    isGroupEligible === false && styles.radioTextSelected,
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  picker: {
    width: "100%",
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#ff6b6b",
  },
  confirmButton: {
    backgroundColor: "#368a73",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  groupEligibilityContainer: {
    width: "100%",
    marginBottom: 15,
    alignItems: "center",
  },
  groupEligibilityText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  radioButton: {
    borderWidth: 1,
    borderColor: "#368a73",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  radioButtonSelected: {
    backgroundColor: "#368a73",
  },
  radioText: {
    color: "#368a73",
  },
  radioTextSelected: {
    color: "#fff",
  },
});
