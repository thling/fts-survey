

import json
import argparse
import csv
import pandas
import math
from sklearn.cross_validation import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.datasets import make_moons, make_circles, make_classification
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, AdaBoostClassifier
from sklearn.naive_bayes import GaussianNB
#from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
#from sklearn.discriminant_analysis import QuadraticDiscriminantAnalysis
from sklearn.metrics import confusion_matrix
from sklearn.cross_validation import StratifiedKFold, KFold, LeaveOneOut
from sklearn.metrics import precision_recall_fscore_support as PRFS
from sklearn import tree
import numpy as np
import os
def generateFeature(args, eachUser):
    
    #eachUser = {'answer':[], 'questionId':[], 'endTime':[], 'mouse':[], 'startTime':[], 'Duration':[], 'move':[], 'label':True, 'totalMove':[]}
    ret = {'label':True}
    question = [m+1 for m in range(13)]
    dkey = ['duration', 'move', 'totalMove']
    for turn in question:
        for key in dkey:
            ret[key+str(turn)] = 0
    for index in range(len(eachUser['questionId'])):
        tar = eachUser['questionId'][index]
        ret['move'+str(tar)] = ret['move'+str(tar)] + math.sqrt((eachUser['mouse'][index][-1][0] - eachUser['mouse'][index][0][0])**2 + (eachUser['mouse'][index][-1][1] - eachUser['mouse'][index][0][1])**2)
        ret['duration'+str(tar)] = ret['duration'+str(tar)] + eachUser['Duration'][index]
        ret['totalMove'+str(tar)] = ret['totalMove'+str(tar)] + math.sqrt(eachUser['totalMove'][index][0]**2 + eachUser['totalMove'][index][1]**2)
    if question != sorted(eachUser['questionId']):
        ret['label']=False
    positive = 0
    negative = 0
    for qid, qans in zip(eachUser['questionId'], eachUser['answer']): # 4 and 9 should be specified
        if qid>2:
            if qid!=4 and qid!=9: #Positive Question
                if 'Agree' in qans['new']:
                    positive = positive + 1
                if 'Disagree' in qans['new']:
                    positive = positive - 1
            else:
                if 'Agree' in qans['new']:
                    negative = negative + 1
                if 'Disagree' in qans['new']:
                    negative = negative - 1
    if not args.mr and positive * negative > 0: #Catch false submission by reliability analysis
        ret['label']=False
        #print positive, negative
        #for qid, qans in zip(eachUser['questionId'], eachUser['answer']): # 4 and 9 should be specified
        #    print qid, qans
    return ret
def JsonToCsv(args):
    
    qu = open(args.question, 'r')
    question_list = {}
    count = 1
    for line in qu:
        json_parsed = json.loads(line)
        question_list[json_parsed["_id"]["$oid"]] = count
        count = count + 1
    f = open(args.answer, 'r')
    user_list = {}
    for line in f:
        def qIDtoNum(li):
            return question_list[li]
        eachUser = {'answer':[], 'questionId':[], 'endTime':[], 'mouse':[], 'startTime':[], 'Duration':[], 'move':[], 'label':True, 'totalMove':[]}
        count = 0
        json_parsed = json.loads(line)
        tracker_data = json_parsed['trackers']
        # open a file for writing
        for key in tracker_data:
            for i_key in key:
                if i_key == 'questionId':
                    ret = qIDtoNum(key[i_key])
                    eachUser[i_key].append(ret)
                elif i_key == 'endTime':
                    eachUser[i_key].append(key[i_key])
                    eachUser['Duration'].append(key['endTime'] - key['startTime'])
                elif i_key == 'mouse':
                    mouse_list = []
                    x = 0
                    y = 0
                    for m_index in range(len(key['mouse'])-1):
                        a = key['mouse'][m_index+1][0] - key['mouse'][m_index][0]
                        b = key['mouse'][m_index+1][1] - key['mouse'][m_index][1]
                        x = x + a
                        y = y + b
                        mouse_list.append([a, b])
                    eachUser['move'].append(mouse_list)
                    eachUser[i_key].append(key[i_key])
                    eachUser['totalMove'].append([x, y])
                else:
                    eachUser[i_key].append(key[i_key])
        uid = json_parsed['_id']
        user_list[uid['$oid']] = eachUser
    whole_list = []
    for key in user_list:
        whole_list.append(generateFeature(args, user_list[key]))
    
    
    data = pandas.DataFrame(data=whole_list)
    
    #kf = StratifiedKFold(data['label'], n_folds=5)
    #kf = KFold(len(data['label']), n_folds=5)
    final_results = []
    classifiers = [
    KNeighborsClassifier(3),
    SVC(kernel="linear", C=0.025),
    SVC(gamma=2, C=1),
    DecisionTreeClassifier(max_depth=5),
    RandomForestClassifier(max_depth=5, n_estimators=10, max_features=1),
    AdaBoostClassifier(),
    GaussianNB(),
    #LinearDiscriminantAnalysis(),
    #QuadraticDiscriminantAnalysis()
    ]
    names = ["Nearest Neighbors", "Linear SVM", "RBF SVM", "Decision Tree","Random Forest", "AdaBoost", "Naive Bayes"]
    #names = ["Naive Bayes"]
    kf_names = ["stratifiedKFold", "KFold", "LeaveOneOut"]
    folds = [StratifiedKFold(data['label'], n_folds=5, shuffle = True), KFold(len(data['label']), n_folds=5, shuffle = True), LeaveOneOut(len(data))]
    for name, clf in zip(names, classifiers):
        print "running {classifier}".format(classifier=name)
        for kf_name, kf in zip(kf_names, folds):
            
            TP = 0
            TN = 0
            FP = 0
            FN = 0
            for train_index, test_index in kf:
                train_data = data.iloc[train_index]
                test_data = data.iloc[test_index]
                
                train_label = train_data['label']
                train_data=train_data.drop('label', axis=1)
                
                test_label = test_data['label']
                test_data=test_data.drop('label', axis=1)
                clf.fit(train_data, train_label)
                results = clf.predict(test_data)
                test_label = np.array(test_label)
                #print PRFS(test_label, results)
                #print confusion_matrix(test_label ,results)
                for key in range(len(results)):
                    if test_label[key] == results[key]:
                        if results[key] == True:
                            TP = TP + 1
                        else:
                            TN = TN + 1
                    else:
                        if results[key] == True:
                            FP = FP + 1
                        else:
                            FN = FN + 1
            #print test_kf, TP, TN, FP, FN
            accuracy = (TP+TN)/float(len(data))
            if (TP+FP)>0:
                precision = TP/float(TP+FP)
            else:
                precision = 0
            if (TP+FN)>0:
                recall = TP/float(TP+FN)
            else:
                recall = 0
            if (2*TP+FP+FN) > 0:
                fscore = (2*TP)/float(2*TP+FP+FN)
            else:
                fscore = 0
            #output_string = "{classifier},{fold},{accuracy},{precision},{recall},{fscore}".format(classifier = name, fold = kf_name, accuracy = accuracy, precision = precision, recall=recall, fscore = fscore)
            #print output_string
            ret = {"classifier":name, "fold":kf_name, "accuracy":accuracy, "precision":precision, "recall":recall, "fscore":fscore, "type1Error":FP/float(TP+TN+FP+FN), "type2Error":FN/float(TP+TN+FP+FN)}
            final_results.append(ret)
            if "Decision Tree" in name:
                tree.export_graphviz(clf, out_file=kf_name, feature_names=np.array(train_data.keys()))
                command = "dot -Tpng {} -o {}.png".format(kf_name, kf_name)
                os.system(command)
                os.system("rm {}".format(kf_name))
            
            if "Naive" in name:
                theta = pandas.DataFrame(data = clf.theta_)
                theta.columns = train_data.columns
                theta.to_csv(kf_name+'_theta.csv', index=False)
                sigma = pandas.DataFrame(data = clf.sigma_)
                sigma.columns = train_data.columns
                sigma.to_csv(kf_name+'_sigma.csv', index=False)
            
    columns = ["classifier", "fold", "accuracy", "precision", "recall", "fscore", "type1Error","type2Error"]
    final_data = pandas.DataFrame(data=final_results)[columns]
    #print final_data
    final_data.to_csv(args.output, index=False)
    
def main():
    parser = argparse.ArgumentParser(description="python bucket_CDF.py --output test --train trainData-1625.csv --test trainData-1625.csv --method regr",formatter_class=argparse.RawDescriptionHelpFormatter)
    #parser.add_argument('--f', default=-1, metavar='X', type=str, help='max number', action=Extender)
    parser.add_argument('--answer', default=False, metavar='X', type=str, help='answer')
    parser.add_argument('--question', default=False, metavar='X', type=str, help='quesion')
    parser.add_argument('--output', default=False, metavar='X', type=str, help='output data')
    parser.add_argument('--mr', default=False, action = 'store_true', help='muteReliability')
    args = parser.parse_args()
    if not args.answer or not args.question or not args.output:
        print "python project.py --answer answers.json --question questions.json --output test.csv"
        print "python project.py --answer answers.json --question questions.json --output test.csv --mr"
    JsonToCsv(args)
    exit()
if __name__ == '__main__':
    main()
