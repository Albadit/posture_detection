// src/app/page.tsx
"use client";
import { useState } from "react";
import { Button, Input, Form, Card} from "@heroui/react";
import { getBaseUrl } from "@/config/base_url"

export default function Home() {
  const [result, setResult] = useState<string>("");

  // Helper to convert a file to a Base64 encoded string
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const patient_id = formData.get("patient_id") as string;
    const measured_by_user_id = formData.get("measured_by_user_id") as string;
    const height_mm = formData.get("height_mm") as string;
    const weight_kg = formData.get("weight_kg") as string;
    const sleep_hours = formData.get("sleep_hours") as string;
    const exercise_hours = formData.get("exercise_hours") as string;

    const fileInput = event.currentTarget.elements.namedItem("image") as HTMLInputElement;
    let image_base64 = null;
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      image_base64 = await fileToBase64(fileInput.files[0]);
    }

    if (!image_base64) {
      setResult("Error: No image provided.");
      return;
    }

    try {
      // 1. Pose detection
      const poseRes = await fetch("https://api.blokk.duckdns.org/pose_detection/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64 }),
      });

      if (!poseRes.ok) {
        const poseError = await poseRes.json();
        setResult("Pose detection failed: " + poseError.detail);
        return;
      }

      const poseData = await poseRes.json();

      if (poseData.issues && poseData.issues.length > 0) {
        setResult("Posture issues detected: " + poseData.issues.join(", "));
        return;
      }

      // 2. Send measurement (met landmark image)
      const payload = {
        patient_id: Number(patient_id),
        measured_by_user_id: Number(measured_by_user_id),
        height_mm: parseFloat(height_mm),
        weight_kg: parseFloat(weight_kg),
        sleep_hours: sleep_hours ? parseFloat(sleep_hours) : null,
        exercise_hours: exercise_hours ? parseFloat(exercise_hours) : null,
        image: poseData.landmark_image, // Use the processed image instead of original
      };

      const res = await fetch(`https://api.blokk.duckdns.org/measurements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setResult("Measurement upload failed: " + errorData.detail);
      } else {
        const data = await res.json();
        setResult(
          `Measurement created: <a href="${data.image}" target="_blank">${data.image}</a>`
        );
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        setResult("Error: " + error.message);
      } else {
        setResult("An unexpected error occurred.");
      }
    }
  };

  return (
    <Card className="max-w-xl w-full p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Measurement Upload Test</h2>
      <Form onSubmit={handleSubmit}>
        <Input label="Patient ID:" type="number" name="patient_id" required />
        <Input label="Measured By (User ID):" type="number" name="measured_by_user_id" required />
        <Input label="Length (mm):" type="number" step="0.01" name="height_mm" required />
        <Input label="Weight (kg):" type="number" step="0.01" name="weight_kg" required />
        <Input label="Sleep Time (hour):" type="number" step="0.01" name="sleep_hours" required/>
        <Input label="Exercise Time (hour):" type="number" step="0.01" name="exercise_hours" required/>
        <Input label="Upload Image (all image types):" type="file" name="image" accept="image/*" required/>
        <Button type="submit" color="primary">
          Submit Measurement
        </Button>
      </Form>
      {result && (
        <div className="mt-6" dangerouslySetInnerHTML={{ __html: result }} />
      )}
    </Card>
  );
}